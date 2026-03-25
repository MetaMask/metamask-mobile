/**
 * Runtime hooks for the visual regression orchestrator.
 *
 * 1. Redirects @metamask/native-utils to the project mock (same one Jest uses)
 *    because the real package is ESM-only and breaks ts-node's CJS require chain.
 *
 * 2. Stubs the Detox `device` global so PlatformDetector.isAndroid() resolves
 *    without requiring a Detox test runner. Visual tests always target iOS.
 */
const Module = require('module');
const path = require('path');

// --- Module redirect: @metamask/native-utils → mock ---
const originalResolveFilename = Module._resolveFilename;
const mockPath = path.resolve(
  __dirname,
  '../../../app/__mocks__/@metamask/native-utils.js',
);

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@metamask/native-utils') {
    return mockPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// --- Stub Detox `device` global for PlatformDetector ---
global.device = { getPlatform: () => 'ios' };
