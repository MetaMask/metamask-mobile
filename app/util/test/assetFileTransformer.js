/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
const path = require('path');

module.exports = {
  process(_, filename) {
    const assetFilename = JSON.stringify(path.basename(filename));

    return {
      code: `module.exports = ${assetFilename};`,
    };
  },
};
