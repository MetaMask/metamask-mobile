# The script invokes tool to generate ppom.html.js
# This is integrated into "yarn setup"
cd ./ppom
yarn clean && yarn && yarn lint && yarn build
cd ..
