import { Octokit } from "npm:@octokit/core";
import { restEndpointMethods } from "npm:@octokit/plugin-rest-endpoint-methods";
import { Command } from "jsr:@cliffy/command@1.0.0-rc.7";

const myToken = Deno.env.get("GITHUB_TOKEN");
if (!myToken) {
  console.error("GITHUB_TOKEN environment variable is required.");
  Deno.exit(1);
}

const log = (type: "error" | "success" | "base" | null, message: string) => {
  switch (type) {
    case "error":
      console.log(`%cERROR:`, "color: red; font-weight: bold;", message);
      break;
    case "success":
      console.log(`%cSUCCESS`, "color: green; font-weight: bold;", message);
      break;
    case "base":
      console.log(message);
      break;
    default:
      console.log(message);
      break;
  }
};

const MyOctokit = Octokit.plugin(restEndpointMethods);
const octokit = new MyOctokit({ auth: myToken });

const { options } = await new Command()
  .name("ghpr")
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
  thankyou: string;
};

if (!type) {
  log("error", "Please enter a type.");
  Deno.exit(0);
}

if (!id) {
  log("error", "Please enter a PR ID.");
  Deno.exit(0);
}

let ids = [] as number[];

if (id.split("-").length > 1) {
  const range = id.split("-").map(Number) as number[];

  if (range.length > 2) {
    log("error", "Invalid range specified!");
    Deno.exit(0);
  }

  ids = [];

  // if more than 50 items are selected, log and error and exit
  if (range[1] - range[0] > 50) {
    log("error", "Range is too large! Please select a range of 50 or less.");
    Deno.exit(0);
  }

  // if range is backwards, log and error and exit
  if (range[1] - range[0] < 0) {
    log("error", "Invalid range specified!");
    Deno.exit(0);
  }

  for (let x = range[0]; x <= range[1]; x++) {
    ids.push(x);
  }
} else {
  ids = id.split(",").map(Number);
}

async function processPullRequest(itemID: number) {
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

  console.log(
    `Enabling automerge for PR #${itemID} from ${author} in ${owner}/${repo}`,
  );

  const response = await octokit.graphql(`query MyQuery {
        repository(name: "${repo}", owner: "${owner}") {
            pullRequest(number: ${itemID}) {
                      id
                  }
            } 
        }`) as { repository: { pullRequest: { id: string } } };

  const graphqlID = response.repository.pullRequest.id;

  await octokit.graphql(`mutation MyMutation {
            enablePullRequestAutoMerge(input: {pullRequestId: "${graphqlID}", mergeMethod: MERGE}) {
                clientMutationId
                 }
        }`);

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
      owner: owner as string,
      repo: repo as string,
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

  return;
}

async function main() {
  for (const item of ids) {
    await processPullRequest(item);
  }
}

main();
