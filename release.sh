#!/bin/bash
echo "> set tag"
for tag in `git tag`; do
  echo $tag
done
echo "< enter tag (omit 'v')"
read tag
echo "> tag=$tag"

# @todo validate tag doesn't exist
# @todo validate tag is valid format
if [ "" = "$tag" ]; then
  echo "ERROR: no tag"
  exit 1
fi

echo "< enter release one-liner"
read releaseOneLiner

if [ "" = "$releaseOneLiner" ]; then
  echo "ERROR: no release one-liner"
  exit 1
fi

echo "# tag: $tag"
echo "# one-liner: $releaseOneLiner"
echo "? is this correct? Y/n"
read prompt
if [ "n" = $prompt ] || [ "N" = $prompt ]; then
  exit 1
fi

echo "- tag" && git tag -a v$tag -m "$releaseOneLiner" && \
echo "- push to git" && git push --tags origin && \
echo "- prepack & publish" && npm publish --access public
