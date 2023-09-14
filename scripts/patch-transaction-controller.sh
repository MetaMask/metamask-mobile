#!/bin/bash

set -e
set -o pipefail

PACKAGE_DIR_OLD="node_modules/@metamask/transaction-controller"
DIST_DIR_OLD="$PACKAGE_DIR_OLD/dist"
PATCH_FILE="patches/@metamask+transaction-controller+*.patch"
COMMENT_LINE_COUNT=10

COMMENT='+PATCH GENERATED FROM MetaMask/core branch refactor/transaction-controller-patch-mobile\
+This patch backports various transaction controller features from the main branch of MetaMask/core\
+Steps to update patch:\
+* Push those changes to the branch listed above, or update the branch listed above\
+* Run `yarn build` on the core monorepo\
+* Delete the directory `node_modules/@metamask/transaction-controller/dist` directory on mobile\
+* Copy over the `dist` directory from the core build to replace the one that was deleted\
+* Delete the mocks directory and any sourcemaps from the `dist` directory to reduce the size of the patch\
+* Restore this comment\
+* Run `yarn patch-package @metamask/transaction-controller`'

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

DIST_DIR_NEW="$1/packages/transaction-controller/dist"

rm -rf $DIST_DIR_OLD
cp -r  $DIST_DIR_NEW $PACKAGE_DIR_OLD
rm -f $DIST_DIR_NEW/*.map

yarn patch-package @metamask/transaction-controller

NEW_LINE=$'\n'
sed -i "" "1i\\$NEW_LINE$COMMENT_DIFF$NEW_LINE" $PATCH_FILE
