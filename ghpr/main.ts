import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Command, EnumType } from "@cliffy/command";
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

export const thankYouMessage = (author: string) => `Thank you @${author} 🎉`;

const MyOctokit = Octokit.plugin(restEndpointMethods);
type GitHubClient = Pick<InstanceType<typeof MyOctokit>, "request" | "graphql">;

const TYPES = ["approve", "automerge", "merge", "mergeonly"] as const;
type PRType = typeof TYPES[number];

interface RunOptions {
  owner: string;
  repo: string;
  type: PRType;
  thankyou?: boolean;
}

async function enableAutoMerge(
  octokit: GitHubClient,
  owner: string,
  repo: string,
  number: number,
) {
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
    { owner, repo, number },
  );

  await octokit.graphql(
    `mutation ($pullRequestId: ID!) {
      enablePullRequestAutoMerge(
        input: { pullRequestId: $pullRequestId, mergeMethod: MERGE }
      ) {
        clientMutationId
      }
    }`,
    { pullRequestId: response.repository.pullRequest.id },
  );
}

export async function processPullRequest(
  octokit: GitHubClient,
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

  const author = pr.data.user?.login ?? "";

  if (pr.data.merged || pr.data.state == "closed") {
    console.log(
      `PR #${itemID} from ${author} in ${owner}/${repo} is already merged or has been closed`,
    );
    return;
  }

  const merging = type == "merge" || type == "mergeonly";

  if (type !== "approve") {
    console.log(
      `Enabling automerge for PR #${itemID} from ${author} in ${owner}/${repo}`,
    );

    try {
      await enableAutoMerge(octokit, owner, repo, itemID);
    } catch (error) {
      // GitHub refuses auto-merge on PRs that are already mergeable; an
      // immediate merge follows for these types anyway.
      if (!merging) throw error;
      log("base", `Could not enable automerge: ${(error as Error).message}`);
    }
  }

  if (type !== "mergeonly") {
    console.log(`Approving PR ${itemID} from ${author} in ${owner}/${repo}`);

    await octokit.request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
      {
        owner,
        repo,
        pull_number: itemID,
        commit_id: pr.data.head.sha,
        event: "APPROVE",
        body: thankyou ? thankYouMessage(author) : undefined,
      },
    );
    log("success", "PR approved");
  }

  if (merging) {
    console.log(`Merging PR ${itemID} from ${author} in ${owner}/${repo}`);

    await octokit.request(
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
      {
        owner,
        repo,
        pull_number: itemID,
        sha: pr.data.head.sha,
        merge_method: "merge",
      },
    );
    log("success", "PR merged");
  }

  if (thankyou && type == "mergeonly") {
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo,
        issue_number: itemID,
        body: thankYouMessage(author),
      },
    );
  }
}

export function buildCommand() {
  return new Command()
    .name("ghpr")
    .version(denoConfig.version)
    .description("Automate PR approvals and merges")
    .type("pr-type", new EnumType(TYPES))
    .option("-t, --type <type:pr-type>", "Type", { required: true })
    .option("-r, --repo <repo>", "Repository name", { required: true })
    .option("-i, --id <id>", "PR ID", { required: true })
    .option("--thankyou", "Thank the PR author")
    .option("-o, --owner <owner>", "Organization name", { required: true });
}

async function main() {
  const { options } = await buildCommand().parse(Deno.args);
  const { owner, repo, id, type, thankyou } = options;

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
