import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { styleText } from "node:util";
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
  const originalEnv = process.env.GITHUB_TOKEN;
  const mockToken = "mock-token";

  beforeEach(() => {
    process.env.GITHUB_TOKEN = mockToken;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.GITHUB_TOKEN = originalEnv;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  describe("parseIds", () => {
    it("parses a single ID", () => {
      assert.deepEqual(parseIds("42"), [42]);
    });

    it("parses comma-separated IDs", () => {
      assert.deepEqual(parseIds("1,2,3"), [1, 2, 3]);
    });

    it("parses an inclusive range", () => {
      assert.deepEqual(parseIds("1-3"), [1, 2, 3]);
    });

    it("parses a start+count range", () => {
      assert.deepEqual(parseIds("1+3"), [1, 2, 3, 4]);
    });

    it("rejects a backwards range", () => {
      assert.throws(() => parseIds("3-1"), /Invalid range/);
    });

    it("rejects a range larger than 50", () => {
      assert.throws(() => parseIds("1-52"), /too large/);
    });

    it("rejects a start+count larger than 25", () => {
      assert.throws(() => parseIds("1+26"), /too large/);
    });

    it("rejects non-numeric input", () => {
      assert.throws(() => parseIds("abc"), /Invalid PR ID/);
    });
  });

  describe("thankYouMessage", () => {
    it("thanks the PR author", () => {
      assert.equal(thankYouMessage("octocat"), "Thank you @octocat 🎉");
    });
  });

  describe("buildCommand", () => {
    const base = ["-o", "o", "-r", "r", "-i", "1"];
    const parse = (args: string[]) =>
      buildCommand()
        .exitOverride()
        .configureOutput({ writeErr: () => {} })
        .parse(args, { from: "user" });

    it("rejects an unknown type", () => {
      assert.throws(() => parse([...base, "-t", "aprove"]), /aprove/);
    });

    it("requires an owner", () => {
      assert.throws(
        () => parse(["-r", "r", "-i", "1", "-t", "approve"]),
        /owner/,
      );
    });

    it("parses --thankyou as a boolean", () => {
      const options = parse([...base, "-t", "merge", "--thankyou"]).opts();
      assert.equal(options.thankyou, true);
    });
  });

  describe("processPullRequest", () => {
    it("approves without enabling auto-merge for approve", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "approve" }, 1);
      assert.deepEqual(calls.slice(1), [REVIEW]);
    });

    it("approves before merging for merge", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "merge" }, 1);
      assert.deepEqual(calls.slice(1), [
        "graphqlID",
        "enableAutoMerge",
        REVIEW,
        MERGE,
      ]);
    });

    it("merges without approving for mergeonly", async () => {
      const { octokit, calls } = fakeOctokit();
      await processPullRequest(octokit, { ...repo, type: "mergeonly" }, 1);
      assert.ok(!calls.includes(REVIEW));
      assert.equal(calls.at(-1), MERGE);
    });

    it("still merges when auto-merge cannot be enabled", async () => {
      const { octokit, calls } = fakeOctokit({ autoMergeFails: true });
      await processPullRequest(octokit, { ...repo, type: "mergeonly" }, 1);
      assert.equal(calls.at(-1), MERGE);
    });

    it("fails automerge when auto-merge cannot be enabled", async () => {
      const { octokit } = fakeOctokit({ autoMergeFails: true });
      await assert.rejects(
        processPullRequest(octokit, { ...repo, type: "automerge" }, 1),
      );
    });

    it("thanks the author in a comment for mergeonly", async () => {
      const { octokit, bodies } = fakeOctokit();
      await processPullRequest(
        octokit,
        { ...repo, type: "mergeonly", thankyou: true },
        1,
      );
      assert.equal(bodies[COMMENT], "Thank you @octocat 🎉");
    });

    it("thanks the author in the review for merge", async () => {
      const { octokit, calls, bodies } = fakeOctokit();
      await processPullRequest(
        octokit,
        { ...repo, type: "merge", thankyou: true },
        1,
      );
      assert.equal(bodies[REVIEW], "Thank you @octocat 🎉");
      assert.ok(!calls.includes(COMMENT));
    });
  });

  describe("log", () => {
    it("formats error messages correctly", () => {
      const consoleLogStub = mock.method(console, "log", () => {});
      try {
        log("error", "Test error");
        assert.deepEqual(consoleLogStub.mock.calls[0].arguments, [
          styleText(["red", "bold"], "ERROR:"),
          "Test error",
        ]);
      } finally {
        consoleLogStub.mock.restore();
      }
    });

    it("passes plain messages through for base/null", () => {
      const consoleLogStub = mock.method(console, "log", () => {});
      try {
        log("base", "hello");
        log(null, "world");
        assert.deepEqual(consoleLogStub.mock.calls[0].arguments, ["hello"]);
        assert.deepEqual(consoleLogStub.mock.calls[1].arguments, ["world"]);
      } finally {
        consoleLogStub.mock.restore();
      }
    });
  });
});
