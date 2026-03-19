/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
// Custom require hook that stubs out detox and react-native
// so tsx/esbuild doesn't try to parse react-native's Flow syntax
const Module = require('module');
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, ...args) {
  // Stub detox — return an empty module
  if (
    request === 'detox' ||
    request === 'detox/detox' ||
    request.startsWith('react-native') ||
    request.startsWith('@metamask/native-utils')
  ) {
    return require.resolve('./stubs/empty.js');
  }
  return originalResolve.call(this, request, parent, ...args);
};
