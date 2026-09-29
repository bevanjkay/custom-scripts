import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import {
  buildCommand,
  log,
  parseIds,
  processPullRequest,
  thankYouMessage,
} from "./main.ts";

function fakeOctokit({ autoMergeFails = false } = {}) {
  const calls: string[] = [];
  const bodies: Record<string, unknown> = {};
  const octokit = {
    request: (route: string, params: Record<string, unknown>) => {
      calls.push(route);
      bodies[route] = params.body;
      const data = route.startsWith("GET")
        ? { user: { login: "octocat" }, head: { sha: "abc" }, state: "open" }
        : {};
      return Promise.resolve({ status: 200, data });
    },
    graphql: (query: string) => {
      const isMutation = query.includes("mutation");
      calls.push(isMutation ? "enableAutoMerge" : "graphqlID");
      if (isMutation && autoMergeFails) {
        return Promise.reject(new Error("Pull request is in clean status"));
      }
      return Promise.resolve({
        repository: { pullRequest: { id: "PR_1" } },
      });
    },
  };
  return {
    octokit: octokit as unknown as Parameters<typeof processPullRequest>[0],
    calls,
    bodies,
  };
}

const REVIEW = "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews";
const MERGE = "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge";
const COMMENT = "POST /repos/{owner}/{repo}/issues/{issue_number}/comments";
const repo = { owner: "o", repo: "r" };

describe("GHPR Tests", () => {
  const originalEnv = Deno.env.get("GITHUB_TOKEN");
  const mockToken = "mock-token";

  beforeEach(() => {
    Deno.env.set("GITHUB_TOKEN", mockToken);
  });

  afterEach(() => {
    if (originalEnv) {
      Deno.env.set("GITHUB_TOKEN", originalEnv);
    } else {
      Deno.env.delete("GITHUB_TOKEN");
    }
  });

  describe("parseIds", () => {
    it("parses a single ID", () => {
      assertEquals(parseIds("42"), [42]);
    });

    it("parses comma-separated IDs", () => {
      assertEquals(parseIds("1,2,3"), [1, 2, 3]);
    });

    it("parses an inclusive range", () => {
      assertEquals(parseIds("1-3"), [1, 2, 3]);
    });

    it("parses a start+count range", () => {
      assertEquals(parseIds("1+3"), [1, 2, 3, 4]);
    });

    it("rejects a backwards range", () => {
      assertThrows(() => parseIds("3-1"), Error, "Invalid range");
    });

    it("rejects a range larger than 50", () => {
      assertThrows(() => parseIds("1-52"), Error, "too large");
    });

    it("rejects a start+count larger than 25", () => {
      assertThrows(() => parseIds("1+26"), Error, "too large");
    });

    it("rejects non-numeric input", () => {
      assertThrows(() => parseIds("abc"), Error, "Invalid PR ID");
    });
  });

  describe("thankYouMessage", () => {
    it("thanks the PR author", () => {
      assertEquals(thankYouMessage("octocat"), "Thank you @octocat 🎉");
    });
  });

  describe("buildCommand", () => {
    const base = ["-o", "o", "-r", "r", "-i", "1"];

    it("rejects an unknown type", async () => {
      await assertRejects(
        () => buildCommand().noExit().parse([...base, "-t", "aprove"]),
        Error,
        "aprove",
      );
    });

    it("requires an owner", async () => {
      await assertRejects(
        () =>
          buildCommand().noExit().parse([
            "-r",
            "r",
            "-i",
            "1",
            "-t",
            "approve",
          ]),
        Error,
        "owner",
      );
    });

    it("parses --thankyou as a boolean", async () => {
      const { options } = await buildCommand().noExit().parse([
        ...base,
        "-t",
        "merge",
        "--thankyou",
      ]);
      assertEquals(options.thankyou, true);
    });
  });

  describe("processPullRequest", () => {
    it("approves without enabling auto-merge for approve", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "approve" }, 1);
      assertEquals(calls.slice(1), [REVIEW]);
    });

    it("approves before merging for merge", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "merge" }, 1);
      assertEquals(calls.slice(1), [
        "graphqlID",
        "enableAutoMerge",
        REVIEW,
        MERGE,
      ]);
    });

    it("merges without approving for mergeonly", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "mergeonly" }, 1);
      assertEquals(calls.includes(REVIEW), false);
      assertEquals(calls.at(-1), MERGE);
    });

    it("still merges when auto-merge cannot be enabled", async () => {
      const { octokit, calls } = fakeOctokit({ autoMergeFails: true });
      await processPullRequest(octokit, { ...repo, type: "mergeonly" }, 1);
      assertEquals(calls.at(-1), MERGE);
    });

    it("fails automerge when auto-merge cannot be enabled", async () => {
      const { octokit } = fakeOctokit({ autoMergeFails: true });
      await assertRejects(() =>
        processPullRequest(octokit, { ...repo, type: "automerge" }, 1)
      );
    });

    it("thanks the author in a comment for mergeonly", async () => {
      const { octokit, bodies } = fakeOctokit();
      await processPullRequest(
        octokit,
        { ...repo, type: "mergeonly", thankyou: true },
        1,
      );
      assertEquals(bodies[COMMENT], "Thank you @octocat 🎉");
    });

    it("thanks the author in the review for merge", async () => {
      const { octokit, calls, bodies } = fakeOctokit();
      await processPullRequest(
        octokit,
        { ...repo, type: "merge", thankyou: true },
        1,
      );
      assertEquals(bodies[REVIEW], "Thank you @octocat 🎉");
      assertEquals(calls.includes(COMMENT), false);
    });
  });

  describe("log", () => {
    it("formats error messages correctly", () => {
      const consoleLogStub = stub(console, "log");
      try {
        log("error", "Test error");
        assertEquals(
          consoleLogStub.calls[0].args,
          ["%cERROR:", "color: red; font-weight: bold;", "Test error"],
        );
      } finally {
        consoleLogStub.restore();
      }
    });

    it("passes plain messages through for base/null", () => {
      const consoleLogStub = stub(console, "log");
      try {
        log("base", "hello");
        log(null, "world");
        assertEquals(consoleLogStub.calls[0].args, ["hello"]);
        assertEquals(consoleLogStub.calls[1].args, ["world"]);
      } finally {
        consoleLogStub.restore();
      }
    });
  });
});
