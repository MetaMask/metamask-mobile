#!/bin/bash

# ! IMPORTANT ! - Do not forget to give permission to this script: `chmod +x ./scripts/patch-assets-controllers.sh``

# Generates the patch for the @metamask/assets-controllers package
# given only the path to a local core repository.

# Applies standardisation including:
# - Adding a comment to the top of the patch which is added to a `.patch.txt` file.
# - Removing all sourcemaps.
# - Removing the mocks directory.

# Requires the assets-controllers package to have already been built
# in the core repository.

set -e
set -o pipefail

PACKAGE="@metamask/assets-controllers"
PACKAGE_DIR_MOBILE="node_modules/$PACKAGE"
DIST_DIR_MOBILE="$PACKAGE_DIR_MOBILE/dist"
PATCH_FILE="patches/@metamask+assets-controllers+*.patch"


COMMENT='+PATCH GENERATED FROM MetaMask/core branch: patch/mobile-assets-controllers-26\
+This patch backports various assets controllers features from the main branch of MetaMask/core\
+Steps to update patch:\
+* Create a new core branch from: patch/mobile-assets-controllers-26\
+* Run "yarn build" in the core monorepo\
+* Run "yarn patch:assets <core-directory>" in the mobile repo\
+* If you have changes also add them to the branch: patch/mobile-assets-controllers-26\
+* Steps to update the assets-controllers version\
+* Create a new core branch from the next assets-controllers version\
+* Merge the branch patch/mobile-assets-controllers-26\
+* Solve the conflicts and review changes accordingly the changelog\
+* Run "yarn build" in the core monorepo\
+* Run "yarn patch:assets <core-directory>" in the mobile repo\
+* If you have changes also add them to the branch: patch/mobile-assets-controllers-26'

# The number of lines of the `COMMENT` variable
COMMENT_LINE_COUNT=14

COMMENT_DIFF='diff --git a/node_modules/@metamask/assets-controllers/dist/.patch.txt b/node_modules/@metamask/assets-controllers/dist/.patch.txt\
new file mode 100644\
index 0000000..550de56\
--- /dev/null\
+++ b/node_modules/@metamask/assets-controllers/dist/.patch.txt\
@@ -0,0 +1,'"$COMMENT_LINE_COUNT"' @@\
'"$COMMENT"

CORE_DIR="$1"

if [ -z "$CORE_DIR" ] ; then
  echo "Usage: yarn patch:assets <core-directory>"
  echo ""
  echo "Example: yarn patch:assets ../core"
  exit 1
fi

DIST_DIR_CORE="$CORE_DIR/packages/assets-controllers/dist"

rm -rf "$DIST_DIR_MOBILE"
cp -r  "$DIST_DIR_CORE" "$PACKAGE_DIR_MOBILE"

rm -rf "$DIST_DIR_MOBILE/mocks"

yarn patch-package "$PACKAGE"


NEW_LINE=$'\n'

# ShellCheck disabled as intentionally not using quotes as PATCH_FILE relies on globbing

#shellcheck disable=SC2086
sed -i.bak "1i\\$NEW_LINE$COMMENT_DIFF$NEW_LINE" $PATCH_FILE

#shellcheck disable=SC2086
rm $PATCH_FILE.bak


