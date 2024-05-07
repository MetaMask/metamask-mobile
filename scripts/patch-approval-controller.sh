#!/bin/bash

# ! IMPORTANT ! - Do not forget to give permission to this script: `chmod +x ./scripts/patch-approval-controller.sh``

# Generates the patch for the @metamask/approval-controller package
# given only the path to a local core repository.

# Applies standardisation including:
# - Adding a comment to the top of the patch which is added to a `.patch.txt` file.
# - Removing all sourcemaps.
# - Removing the mocks directory.

# Requires the approval-controller package to have already been built
# in the core repository.

set -e
set -o pipefail

PACKAGE="@metamask/approval-controller"
PACKAGE_DIR_MOBILE="node_modules/$PACKAGE"
DIST_DIR_MOBILE="$PACKAGE_DIR_MOBILE/dist"
PATCH_FILE="patches/@metamask+approval-controller+*.patch"
COMMENT_LINE_COUNT=7

COMMENT='+PATCH GENERATED FROM MetaMask/core branch: patch/mobile-approval-controller-3-5-2\
+This patch backports various transaction controller features from the main branch of MetaMask/core\
+Steps to update patch:\
+* Create a new core branch from: patch/mobile-approval-controller-3-5-2\
+* Run "yarn build" in the core monorepo\
+* Run "yarn patch:approval <core-directory>" in the mobile repo\
+* Once the new patch is merged, add your changes to: patch/mobile-approval-controller-3-5-2'

COMMENT_DIFF='diff --git a/node_modules/@metamask/approval-controller/dist/.patch.txt b/node_modules/@metamask/approval-controller/dist/.patch.txt\
new file mode 100644\
index 0000000..550de56\
--- /dev/null\
+++ b/node_modules/@metamask/approval-controller/dist/.patch.txt\
@@ -0,0 +1,'"$COMMENT_LINE_COUNT"' @@\
'"$COMMENT"

CORE_DIR="$1"

if [ -z "$CORE_DIR" ] ; then
  echo "Usage: yarn patch:approval <core-directory>"
  echo ""
  echo "Example: yarn patch:approval ../core"
  exit 1
fi

DIST_DIR_CORE="$CORE_DIR/packages/approval-controller/dist"

rm -rf "$DIST_DIR_MOBILE"
cp -r  "$DIST_DIR_CORE" "$PACKAGE_DIR_MOBILE"

rm -f "$DIST_DIR_MOBILE"/*.map
rm -rf "$DIST_DIR_MOBILE/mocks"

yarn patch-package "$PACKAGE"

NEW_LINE=$'\n'

# ShellCheck disabled as intentionally not using quotes as PATCH_FILE relies on globbing

#shellcheck disable=SC2086
sed -i.bak "1i\\$NEW_LINE$COMMENT_DIFF$NEW_LINE" $PATCH_FILE

#shellcheck disable=SC2086
rm $PATCH_FILE.bak
