#!/usr/bin/env bash

set -e

REVIEWER=$1

if ! [ -x "$(command -v hub)" ]; then
  echo 'Error: hub is not installed. It is required to open the pull-request' >&2
  exit 1
fi

# Refresh git
git fetch origin

COMMIT_TO_DEPLOY=`git rev-list -1 master`
COMMIT_TO_DEPLOY_TIMESTAMP=`git show -s --format=%ct $COMMIT_TO_DEPLOY`

echo "This command will open a pull request to deploy $COMMIT_TO_DEPLOY to production"

# Get the timestamp of the latest commit deployed
# For this we need to parse the commit message of the latest production commit
# IMPORTANT: all of our commits on production need to have the latest commit from master which they deploy
# using the following format: commit:<SHA1>.
# Automated deploys will not work if we are not able to get that commit.

LATEST_PRODUCTION_COMMIT_MESSAGE=`git log -1 origin/production --pretty=%B`
COMMIT_REGEX="commit:([0-9a-f]{40})"

if [[ $LATEST_PRODUCTION_COMMIT_MESSAGE =~ $COMMIT_REGEX ]]
then
  LATEST_COMMIT_ID_IN_PRODUCTION="${BASH_REMATCH[1]}"
else
  echo "Skipping automated deployment. Latest production does not include commit sha1 (this is to avoid deploying an older version of master)."
  exit 0
fi

LATEST_PRODUCTION_TIMESTAMP=`git show -s --format=%ct $LATEST_COMMIT_ID_IN_PRODUCTION`

if [[ $((COMMIT_TO_DEPLOY_TIMESTAMP)) < $((LATEST_PRODUCTION_TIMESTAMP)) ]]
then
  COMMIT_TO_DEPLOY_DATE=`date -d @$COMMIT_TO_DEPLOY_TIMESTAMP`
  LATEST_PRODUCTION_DATE=`date -d @$LATEST_PRODUCTION_TIMESTAMP`
  echo "Latest production ($LATEST_PRODUCTION: $LATEST_PRODUCTION_DATE) is more recent than current master ($COMMIT_TO_DEPLOY: $COMMIT_TO_DEPLOY_DATE) : skipping deployment."
  exit 0
fi

echo "Diffing versus latest production"
LATEST_PRODUCTION=`git rev-parse origin/production`
git reset --soft $LATEST_PRODUCTION

echo "Committing diff"
COMMIT_MESSAGE="Manual deploy as of commit:$COMMIT_TO_DEPLOY"
git commit -m "$COMMIT_MESSAGE" -a --no-verify

echo "Push new production branch"
git push origin $BRANCH --no-verify

echo "Open pull request"
source ./production-pull-request-template.sh
GITHUB_TOKEN=$GITHUB_API_TOKEN ./../hub-linux-amd64-2.11.2/bin/hub pull-request -b production -h $BRANCH --message "$MESSAGE" -r ${REVIEWER}

git checkout master
