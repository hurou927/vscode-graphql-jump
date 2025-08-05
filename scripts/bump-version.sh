#!/bin/bash

set -e

# Check if bump type is provided
if [ -z "$1" ]; then
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

BUMP_TYPE=$1

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Bump type must be 'patch', 'minor', or 'major'"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "Error: Working directory is not clean. Please commit or stash your changes."
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
case $BUMP_TYPE in
    patch)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
        ;;
    minor)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$(NF-1) = $(NF-1) + 1; $NF = 0;} 1' | sed 's/ /./g')
        ;;
    major)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$1 = $1 + 1; $2 = 0; $3 = 0;} 1' | sed 's/ /./g')
        ;;
esac

echo "New version: $NEW_VERSION"

# Update package.json version
npm version $NEW_VERSION --no-git-tag-version

# Commit the version change
git add package.json package-lock.json
git commit -m "Bump version to $NEW_VERSION"

# Create and push tag
git tag "v$NEW_VERSION"
git push origin "v$NEW_VERSION"
echo "Created tag: v$NEW_VERSION"

echo "Version bumped successfully!"
# echo "To trigger a release, push the tag:"
# echo "  git push origin v$NEW_VERSION"
# echo "Or push all tags:"
# echo "  git push origin --tags"

git tag -1
