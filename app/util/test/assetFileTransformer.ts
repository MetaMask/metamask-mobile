/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
import path from 'path';

interface AssetTransformer {
  process: (_: unknown, filename: string) => { code: string };
}

const assetTransformer: AssetTransformer = {
  process(_: unknown, filename: string) {
    const assetFilename = JSON.stringify(path.basename(filename));

    return {
      code: `module.exports = ${assetFilename};`,
    };
  },
};

export = assetTransformer;
