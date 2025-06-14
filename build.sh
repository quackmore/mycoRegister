#!/bin/bash

# Navigate to the root of your Git repository if not already there
# cd /path/to/your/repo

echo "--- Starting PWA Build Process ---"
# Step 0: Make sure you're on branch dev
# Function to get the current Git branch name
get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Check if we are in a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: Not in a Git repository."
  exit 1
fi

CURRENT_BRANCH=$(get_current_branch)
EXPECTED_BRANCH="dev"

# Check if the current branch is the expected branch
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "Error: You are currently on branch '$CURRENT_BRANCH'."
  echo "This script must be run from the '$EXPECTED_BRANCH' branch."
  exit 1
else
  echo "Success: You are on the '$EXPECTED_BRANCH' branch. Proceeding..."
  # Add your subsequent script commands here
fi

# Step 1: Run the Node.js script to generate the version file
echo "1. Generating app version file..."
node scripts/generateVersion.js
if [ $? -ne 0 ]; then
    echo "Error: Version file generation failed. Aborting build."
    exit 1
fi

# Step 2: (Optional but Recommended) Run your actual app build process
echo "2. Skipping bundle"
# If you have a front-end build (e.g., Webpack, Vite, Create React App build)
# that bundles your main application code and service worker.
# echo "2. Building the client-side application (e.g., npm run build)..."
# npm run build # Or yarn build, or your specific build command
# if [ $? -ne 0 ]; then
#     echo "Error: Client application build failed. Aborting."
#     exit 1
# fi

# Step 3: Stage the generated version file and any other build artifacts
# Make sure the generated app-version.js and other build outputs are staged
echo "3. Staging generated files..."
git add public/app-version.js # Add the generated version file
# git add dist/ # Or whatever your build output directory is
git commit -m "Build: Incorporate app version $(git describe --tags --always) and build artifacts"

git checkout master
git merge dev
git checkout dev

# Step 4: Push the master branch to production
echo "4. Pushing master branch to production..."
git push production master
if [ $? -ne 0 ]; then
    echo "Error: Failed to push to production branch. Aborting."
    exit 1
fi

echo "--- PWA Build Process Complete! ---"