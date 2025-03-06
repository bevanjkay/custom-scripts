#!/bin/bash

# Check if `brew` is installed
if ! command -v brew &> /dev/null; then
  echo "Error: brew is not installed."
  exit 1
fi

# Check if `parallel` is installed
if ! command -v parallel &> /dev/null; then
  echo "Error: parallel is not installed."
  exit 1
fi

# Check if a tap argument is provided
if [[ -z $1 ]]; then
  echo "Error: No tap argument provided."
  exit 1
fi

tap=$1

# Check if the tap exists
if ! brew tap | grep -q "$1"; then
  echo "Error: Tap $1 not found."
  exit 1
fi


# Run `brew list -1 --casks` and store the output in an array
brew_casks=$(brew list -1 --casks 2>/dev/null)

autobump_file=$(brew --repository $1)/.github/autobump.txt
# Check if `.github/autobump.txt` exists
if [[ ! -f $autobump_file ]]; then
  echo "Error: $autobump_file not found."
  exit 1
fi

# Read the contents of `.github/autobump.txt` into an array
autobump_items=$(cat $autobump_file)

# Find items in `brew_casks` that are not in `autobump_items`
missing_items=()
for cask in $brew_casks; do
  if ! grep -qx "$cask" <<< "$autobump_items"; then
    missing_items+=("$cask")
  fi
done

# Output the missing items and run livecheck in parallel
if [[ ${#missing_items[@]} -eq 0 ]]; then
  echo "All items in 'brew list -1 --casks' are present in '.github/autobump.txt'."
else
  echo "Items in 'brew list -1 --casks' but not in '.github/autobump.txt':"
  printf '%s\n' "${missing_items[@]}" | parallel --tty -j6 'brew livecheck --cask {}'
fi