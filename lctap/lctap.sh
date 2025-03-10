#!/bin/bash

# Check if `brew` is installed
if ! command -v brew &> /dev/null; then
  echo "Error: brew is not installed."
  exit 1
fi

# Check if `jq` is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed."
  exit 1
fi

# Check if `parallel` is installed
if ! command -v parallel &> /dev/null; then
  echo "Error: parallel is not installed."
  exit 1
fi

# Check if a tap argument is provided
if [[ -z $1 ]]; then
  echo "Error: No tap argument provided.\n"
  echo "Usage: ./lctap.sh <tap>"
  exit 1
fi

tap=$1

# Check if the tap exists
if ! brew tap | grep -q "$1"; then
  echo "Error: Tap $1 not found."
  exit 1
fi

if [[ $tap == "homebrew/cask" ]]; then
# Run `brew list -1 --casks` and store the output in an array
  cask=true
  items=$(curl -s https://formulae.brew.sh/api/cask.json | jq -r '.[] | select(.version != "latest") | select(.deprecated == false) | select(.disabled == false) | .token')
elif [[ $tap == "homebrew/core" ]]; then
  formula=true
  items=$(curl -s https://formulae.brew.sh/api/formula.json | jq -r '.[] | select(.deprecated == false) | select(.disabled == false) | .name')
else
  cask=true
  items=$(brew tap-info --json $1 | jq -r '.[] | .cask_tokens[]')
fi

# Check if the curl or jq command failed
if [[ $? -ne 0 || -z "$items" ]]; then
  echo "Error: Failed to fetch data."
  exit 1
fi

autobump_list=$(cat $(brew --repository $1)/.github/autobump.txt)

# create an array of items that are not in autobump_list
missing_items=()
while IFS= read -r item; do
  if ! echo "$autobump_list" | grep -Fxq "$item"; then
    missing_items+=("$item")
  fi
done <<< "$items"

# Output the missing items and run livecheck in parallel
if [[ ${#missing_items[@]} -eq 0 ]]; then
  echo "All items in 'brew list -1 --casks' are present in '.github/autobump.txt'."
elif [[ $tap == "homebrew/core" ]]; then
  printf '%s\n' "${missing_items[@]}" | parallel --tty -j6 'brew livecheck --formula {}'
else
  printf '%s\n' "${missing_items[@]}" | parallel --tty -j6 'brew livecheck --cask {}'
fi