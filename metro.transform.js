/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const svgTransformer = require('react-native-svg-transformer');
const defaultTransformer = require('metro-react-native-babel-transformer');
const path = require('path');
const {
  removeFencedCode,
  lintTransformedFile,
} = require('./app/transforms/remove-fenced-code');

const filesExtToScan = ['.js', '.cjs', '.mjs', '.ts'];
const availableFeatures = new Set(['flask', 'snaps', 'beta']);

const mainFeatureSet = new Set([]);
const flaskFeatureSet = new Set(['flask', 'snaps']);

module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    return svgTransformer.transform({ src, filename, options });
  }

  function getBuildTypeFeatures() {
    const buildType = process.env.METAMASK_BUILD_TYPE ?? 'main';
    switch (buildType) {
      case 'main':
        return mainFeatureSet;
      case 'flask':
        return flaskFeatureSet;
      default:
        throw new Error(
          `Invalid BUILD_TYPE of ${buildType} was passed to metro transform`,
        );
    }
  }

  /**
   * params based on builds we're code splitting
   * i.e: flavorDimensions "version" productFlavors from android/app/build.gradle
   */
  if (filesExtToScan.includes(path.extname(filename))) {
    const [processedSource, didModify] = removeFencedCode(
      filename,
      {
        all: availableFeatures,
        active: getBuildTypeFeatures(),
      },
      src,
    );
    if (didModify) {
      await lintTransformedFile(processedSource, filename);
    }
    return defaultTransformer.transform({
      src: processedSource,
      filename,
      options,
    });
  }
  return defaultTransformer.transform({ src, filename, options });
};
