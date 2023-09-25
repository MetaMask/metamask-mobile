#!/bin/bash

# Generates the patch for the @metamask/transaction-controller package
# given only the path to a local core repository.

# Applies standardisation including:
# - Adding a comment to the top of the patch which is added to a `.patch.txt` file.
# - Removing all sourcemaps.
# - Removing the mocks directory.

# Requires the transaction-controller package to have already been built
# in the core repository.

set -e
set -o pipefail

PACKAGE="@metamask/transaction-controller"
PACKAGE_DIR_MOBILE="node_modules/$PACKAGE"
DIST_DIR_MOBILE="$PACKAGE_DIR_MOBILE/dist"
PATCH_FILE="patches/@metamask+transaction-controller+*.patch"
COMMENT_LINE_COUNT=7

COMMENT='+PATCH GENERATED FROM MetaMask/core branch: refactor/transaction-controller-patch-mobile\
+This patch backports various transaction controller features from the main branch of MetaMask/core\
+Steps to update patch:\
+* Create a new core branch from: refactor/transaction-controller-patch-mobile\
+* Run "yarn build" in the core monorepo\
+* Run "yarn patch:tx <core-directory>" in the mobile repo\
+* Once the new patch is merged, add your changes to: refactor/transaction-controller-patch-mobile'

COMMENT_DIFF='diff --git a/node_modules/@metamask/transaction-controller/dist/.patch.txt b/node_modules/@metamask/transaction-controller/dist/.patch.txt\
new file mode 100644\
index 0000000..550de56\
--- /dev/null\
+++ b/node_modules/@metamask/transaction-controller/dist/.patch.txt\
@@ -0,0 +1,'"$COMMENT_LINE_COUNT"' @@\
'"$COMMENT"

CORE_DIR="$1"

if [ -z "$CORE_DIR" ] ; then
  echo "Usage: yarn patch:tx <core-directory>"
  echo ""
  echo "Example: yarn patch:tx ../core"
  exit 1
fi

DIST_DIR_CORE="$CORE_DIR/packages/transaction-controller/dist"

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
