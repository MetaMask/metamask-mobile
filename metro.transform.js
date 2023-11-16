/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const svgTransformer = require('react-native-svg-transformer');
const defaultTransformer = require('metro-react-native-babel-transformer');
const path = require('path');
const {
  removeFencedCode,
  lintTransformedFile,
} = require('./remove-fenced-code.js');

const filesExtToScan = ['.js', '.cjs', '.mjs', '.ts'];

module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    return svgTransformer.transform({ src, filename, options });
  }
  /**
   * params based on builds we're code splitting
   * i.e: flavorDimensions "version" productFlavors from android/app/build.gradle
   */
  if (filesExtToScan.includes(path.extname(filename))) {
    const [processedSource, didModify] = removeFencedCode(
      filename,
      { all: new Set(['flask', 'snaps']), active: new Set([]) },
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
