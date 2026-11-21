#!/usr/bin/env bash
# GitHub Pages에 배포: 테스트 → 빌드 → dist/ 를 gh-pages 브랜치로 올린다.
# 사용: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE_URL=$(git remote get-url origin)
REPO_NAME=$(basename -s .git "$REMOTE_URL")

npm test
BASE_PATH="/${REPO_NAME}/" npm run build
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "배포 $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$REMOTE_URL" gh-pages
rm -rf .git
echo "배포를 올렸어요. 1~2분 뒤 반영됩니다."
