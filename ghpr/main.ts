import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Command } from "@cliffy/command";
import denoConfig from "./deno.json" with { type: "json" };

export const log = (
  type: "error" | "success" | "base" | null,
  message: string,
) => {
  switch (type) {
    case "error":
      console.log(`%cERROR:`, "color: red; font-weight: bold;", message);
      break;
    case "success":
      console.log(`%cSUCCESS`, "color: green; font-weight: bold;", message);
      break;
    case "base":
    default:
      console.log(message);
      break;
  }
};

/**
 * Parse a PR id argument into an explicit list of PR numbers.
 * Supports: single ("42"), comma list ("1,2,3"), inclusive range ("1-3")
 * and start+count ("1+3" => 1,2,3,4). Throws on malformed or oversized input.
 */
export function parseIds(id: string): number[] {
  if (id.includes("-")) {
    const range = id.split("-").map(Number);

    if (range.length > 2 || range.some(Number.isNaN)) {
      throw new Error("Invalid range specified!");
    }
    if (range[1] - range[0] < 0) {
      throw new Error("Invalid range specified!");
    }
    if (range[1] - range[0] > 50) {
      throw new Error(
        "Range is too large! Please select a range of 50 or less.",
      );
    }

    const ids: number[] = [];
    for (let x = range[0]; x <= range[1]; x++) {
      ids.push(x);
    }
    return ids;
  }

  if (id.includes("+")) {
    const parts = id.split("+");
    if (parts.length > 2) {
      throw new Error("Invalid range specified!");
    }

    const start = Number(parts[0]);
    const count = Number(parts[1]);
    if (Number.isNaN(start) || Number.isNaN(count)) {
      throw new Error("Invalid range specified!");
    }
    if (count > 25) {
      throw new Error(
        "Range is too large! Please select a range of 25 or less.",
      );
    }

    const ids: number[] = [];
    for (let x = start; x <= start + count; x++) {
      ids.push(x);
    }
    return ids;
  }

  const ids = id.split(",").map(Number);
  if (ids.some(Number.isNaN)) {
    throw new Error("Invalid PR ID specified!");
  }
  return ids;
}

const MyOctokit = Octokit.plugin(restEndpointMethods);
type OctokitInstance = InstanceType<typeof MyOctokit>;

interface RunOptions {
  owner: string;
  repo: string;
  type: string;
  thankyou?: string;
}

async function processPullRequest(
  octokit: OctokitInstance,
  { owner, repo, type, thankyou }: RunOptions,
  itemID: number,
) {
  const pr = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: itemID,
    },
  );

  const author = pr?.data?.user?.login;

  if (pr.data.merged || pr.data.state == "closed") {
    console.log(
      `PR #${itemID} from ${author} in ${owner}/${repo} is already merged or has been closed`,
    );
    return;
  }

  // Enable auto-merge for automerge/merge/mergeonly, but not approve-only runs.
  if (type !== "approve") {
    console.log(
      `Enabling automerge for PR #${itemID} from ${author} in ${owner}/${repo}`,
    );

    const response = await octokit.graphql<
      { repository: { pullRequest: { id: string } } }
    >(
      `query ($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            id
          }
        }
      }`,
      { owner, repo, number: itemID },
    );

    const graphqlID = response.repository.pullRequest.id;

    await octokit.graphql(
      `mutation ($pullRequestId: ID!) {
        enablePullRequestAutoMerge(
          input: { pullRequestId: $pullRequestId, mergeMethod: MERGE }
        ) {
          clientMutationId
        }
      }`,
      { pullRequestId: graphqlID },
    );
  }

  if (type == "approve" || type == "automerge") {
    console.log(`Approving PR ${itemID} from ${author} in ${owner}/${repo}`);

    const approveBody: {
      owner: string;
      repo: string;
      pull_number: number;
      commit_id: string;
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
      body?: string;
    } = {
      owner,
      repo,
      pull_number: itemID,
      commit_id: pr.data.head.sha,
      event: "APPROVE",
    };

    if (thankyou) {
      approveBody.body = `Thank you @${author}!`;
    }

    const approve = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
      approveBody,
    );

    if (approve.status !== 200) {
      log("error", approve.data.body_text || "");
      throw new Error("ERROR");
    } else {
      log("success", "PR approved");
    }
  }

  if (type == "merge" || type == "mergeonly") {
    console.log(`Merging PR ${itemID} from ${author} in ${owner}/${repo}`);

    const merge = await octokit.request(
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
      {
        owner,
        repo,
        pull_number: itemID,
        sha: pr.data.head.sha,
        merge_method: "merge",
      },
    );

    if (merge.status !== 200) {
      log("error", merge.data.message);
      throw new Error("ERROR");
    } else {
      log("success", "PR merged");
    }
  }
}

async function main() {
  const { options } = await new Command()
    .name("ghpr")
    .version(denoConfig.version)
    .description("Automate PR approvals and merges")
    .option("-t, --type <type>", "Type")
    .option("-r, --repo <repo>", "Repository name")
    .option("-i, --id <id>", "PR ID")
    .option("-ty, --thankyou <thankyou>", "Thank you message")
    .option("-o, --owner <owner>", "Organization name")
    .parse(Deno.args);

  const { owner, repo, id, type, thankyou } = options as {
    owner: string;
    repo: string;
    id: string;
    type: string;
    thankyou?: string;
  };

  if (!type) {
    log("error", "Please enter a type.");
    Deno.exit(1);
  }

  if (!id) {
    log("error", "Please enter a PR ID.");
    Deno.exit(1);
  }

  let ids: number[];
  try {
    ids = parseIds(id);
  } catch (error) {
    log("error", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }

  const myToken = Deno.env.get("GITHUB_TOKEN");
  if (!myToken) {
    log("error", "GITHUB_TOKEN environment variable is required.");
    Deno.exit(1);
  }

  const octokit = new MyOctokit({ auth: myToken });

  for (const item of ids) {
    await processPullRequest(octokit, { owner, repo, type, thankyou }, item);
  }
}

if (import.meta.main) {
  main();
}
