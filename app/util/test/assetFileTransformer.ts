/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
import path from 'path';

interface AssetTransformer {
  process: (filename: string) => { code: string };
}

const assetTransformer: AssetTransformer = {
  process(filename: string) {
    const assetFilename = JSON.stringify(path.basename(filename));

    return {
      code: `module.exports = ${assetFilename};`,
    };
  },
};

export = assetTransformer;
