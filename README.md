# myscripts

A small collection of personal command-line utilities. The three TypeScript
tools run on [Node.js](https://nodejs.org) and are organised as an
[npm workspace](https://docs.npmjs.com/cli/using-npm/workspaces); the remaining
tool is a standalone Bash script.

| Tool                          | Runtime | What it does                                                          |
| ----------------------------- | ------- | --------------------------------------------------------------------- |
| [`ghpr`](#ghpr)               | Node    | Approve and/or merge GitHub pull requests in bulk.                    |
| [`bible`](#bible)             | Node    | Print a Bible passage for a reference from the command line.          |
| [`fluro-songs`](#fluro-songs) | Node    | Search Fluro service plans for a song and show its key and owner.     |
| [`lctap`](#lctap)             | Bash    | Run `brew livecheck` for Homebrew tokens missing from `autobump.txt`. |

## Prerequisites

- [Node.js](https://nodejs.org) 24 or later for the TypeScript tools.
- `bash`, [`brew`](https://brew.sh), `jq` and `parallel` for `lctap`.

## Development

Install dependencies with `npm install`. Common tasks are defined at the
workspace root and run across every project:

```sh
npm run check   # type-check
npm run lint    # lint
npm run fmt     # format
npm test        # run all tests
npm run build   # compile each project to dist/
```

Node runs the TypeScript sources directly, so `npm start` works from inside a
project without a build. The build emits plain JavaScript for installation,
since Node won't strip types from files under `node_modules`.

## Tools

### ghpr

Bulk-approve and/or merge pull requests.

**Environment:** `GITHUB_TOKEN` — a token with repo access.

```sh
cd ghpr
GITHUB_TOKEN=… npm start -- \
  --owner <org> --repo <repo> --type <type> --id <ids> [--thankyou]
```

`--thankyou` posts "Thank you @<author> 🎉" on each PR: in the approval review,
or as a comment for `mergeonly`.

**Types (`--type`):**

- `approve` — approve only.
- `automerge` — enable auto-merge and approve.
- `merge` — enable auto-merge if possible, approve, and merge immediately.
- `mergeonly` — enable auto-merge if possible and merge immediately, without
  approving.

**ID formats (`--id`):**

- Single: `42`
- Comma list: `1,2,3`
- Inclusive range: `1-5` (max 50)
- Start plus count: `1+3` → `1,2,3,4` (max 25)

### bible

Print the text of a Bible reference (via
[`youversion-suggest`](https://www.npmjs.com/package/youversion-suggest)).

```sh
cd bible
npm start -- "John 3:16"
```

### fluro-songs

Search [Fluro](https://fluro.io) service plans for a song and print its title,
key and the person responsible.

**Environment:** `FLURO_ACCOUNT`, `FLURO_USERNAME`, `FLURO_PASSWORD`.

```sh
cd fluro-songs
FLURO_ACCOUNT=… FLURO_USERNAME=… FLURO_PASSWORD=… npm start -- "Amazing Grace"
```

### lctap

For a Homebrew tap, list tokens that are **not** in the tap's
`.github/autobump.txt` and run `brew livecheck` on them in parallel. Accepts
`homebrew/core`, `homebrew/cask`, or any other tap.

```sh
./lctap/lctap.sh <tap>
```

## Releases

Releases are cut from GitHub Actions via the **Release Node Project** and
**Release Bash Project** workflows (`workflow_dispatch`), which build the
project and publish a `<project>-<version>` release. Node projects release the
version already in their `package.json`, so bump it in a pull request first.
