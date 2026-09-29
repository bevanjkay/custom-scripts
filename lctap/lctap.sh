#!/bin/bash

set -o pipefail

for command in brew jq parallel; do
  if ! command -v "$command" &> /dev/null; then
    echo "Error: $command is not installed."
    exit 1
  fi
done

if [[ -z $1 ]]; then
  echo "Error: No tap argument provided."
  echo "Usage: ./lctap.sh <tap>"
  exit 1
fi

tap=$1

if ! brew tap | grep -Fxq "$tap"; then
  echo "Error: Tap $tap not found."
  exit 1
fi

# Each item is "<formula|cask><TAB><name>" so livecheck gets the right flag.
if [[ $tap == "homebrew/cask" ]]; then
  items=$(curl -fsS https://formulae.brew.sh/api/cask.json | jq -r '.[] | select(.version != "latest") | select(.deprecated == false) | select(.disabled == false) | "cask\t\(.token)"')
elif [[ $tap == "homebrew/core" ]]; then
  items=$(curl -fsS https://formulae.brew.sh/api/formula.json | jq -r '.[] | select(.deprecated == false) | select(.disabled == false) | "formula\t\(.name)"')
else
  items=$(brew tap-info --json "$tap" | jq -r '.[] | (.formula_names[] | "formula\t\(.)"), (.cask_tokens[] | "cask\t\(.)")')
fi

# shellcheck disable=SC2181
if [[ $? -ne 0 || -z "$items" ]]; then
  echo "Error: Failed to fetch data."
  exit 1
fi

autobump_file="$(brew --repository "$tap")/.github/autobump.txt"
if [[ -f "$autobump_file" ]]; then
  autobump_list=$(cat "$autobump_file")
else
  autobump_list=""
fi

missing_items=()
while IFS=$'\t' read -r kind name; do
  # Tap names may be fully qualified (user/tap/name); autobump.txt is not.
  if ! grep -Fxq "${name##*/}" <<< "$autobump_list"; then
    missing_items+=("$kind"$'\t'"$name")
  fi
done <<< "$items"

if [[ ${#missing_items[@]} -eq 0 ]]; then
  echo "All items in $tap are present in '.github/autobump.txt'."
else
  printf '%s\n' "${missing_items[@]}" | parallel --tty -j6 --colsep '\t' 'brew livecheck --{1} {2}'
fi
