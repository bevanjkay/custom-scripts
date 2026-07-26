# myscripts

A small collection of personal command-line utilities. The three TypeScript
tools run on [Deno](https://deno.com) and are organised as a
[Deno workspace](https://docs.deno.com/runtime/fundamentals/workspaces/); the
remaining tool is a standalone Bash script.

| Tool                          | Runtime | What it does                                                          |
| ----------------------------- | ------- | --------------------------------------------------------------------- |
| [`ghpr`](#ghpr)               | Deno    | Approve and/or merge GitHub pull requests in bulk.                    |
| [`bible`](#bible)             | Deno    | Print a Bible passage for a reference from the command line.          |
| [`fluro-songs`](#fluro-songs) | Deno    | Search Fluro service plans for a song and show its key and owner.     |
| [`lctap`](#lctap)             | Bash    | Run `brew livecheck` for Homebrew tokens missing from `autobump.txt`. |

## Prerequisites

- [Deno](https://deno.com) 2.x for the TypeScript tools.
- `bash`, [`brew`](https://brew.sh), `jq` and `parallel` for `lctap`.

## Development

Common tasks are defined at the workspace root and run across every project:

```sh
deno task check   # type-check
deno task lint    # lint
deno task fmt     # format
deno task test    # run all tests
```

Each project also builds a self-contained binary with `deno task build` from
inside its directory.

## Tools

### ghpr

Bulk-approve and/or merge pull requests.

**Environment:** `GITHUB_TOKEN` — a token with repo access.

```sh
cd ghpr
GITHUB_TOKEN=… deno task start \
  --owner <org> --repo <repo> --type <type> --id <ids> [--thankyou "message"]
```

**Types (`--type`):**

- `approve` — approve only.
- `automerge` — approve and enable auto-merge.
- `merge` — enable auto-merge and merge immediately.
- `mergeonly` — enable auto-merge and merge immediately, without approving.

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
deno task dev "John 3:16"
```

### fluro-songs

Search [Fluro](https://fluro.io) service plans for a song and print its title,
key and the person responsible.

**Environment:** `FLURO_ACCOUNT`, `FLURO_USERNAME`, `FLURO_PASSWORD`.

```sh
cd fluro-songs
FLURO_ACCOUNT=… FLURO_USERNAME=… FLURO_PASSWORD=… deno task start "Amazing Grace"
```

### lctap

For a Homebrew tap, list tokens that are **not** in the tap's
`.github/autobump.txt` and run `brew livecheck` on them in parallel. Accepts
`homebrew/core`, `homebrew/cask`, or any other tap.

```sh
./lctap/lctap.sh <tap>
```

## Releases

Releases are cut from GitHub Actions via the **Release Deno Project** and
**Release Bash Project** workflows (`workflow_dispatch`), which bump the
project's version, build the binary, and publish a `<project>-<version>`
release.
