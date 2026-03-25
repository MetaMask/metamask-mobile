/**
 * Runtime hooks for the visual regression orchestrator.
 *
 * These hooks let the orchestrator run outside of Detox/Jest by shimming
 * modules and globals that assume a test runner is present.
 *
 * 1. @metamask/native-utils — ESM-only package that breaks ts-node's CJS
 *    require chain. Redirected to the Jest mock the project already provides.
 *
 * 2. Playwright modules — PlaywrightAdapter, PlaywrightMatchers, and
 *    PlaywrightGestures use TypeScript decorators (@boxedStep) that
 *    ts-node --transpile-only cannot compile. They are NOT used by the
 *    visual orchestrator at all, but get pulled in transitively because
 *    MockServerE2E imports from the tests/framework barrel (index.ts),
 *    which re-exports Playwright modules alongside the types MockServerE2E
 *    actually needs (MockApiEndpoint, Resource, ServerStatus, etc.).
 *
 *    TODO: File a bug to refactor MockServerE2E.ts so it imports types
 *    directly from tests/framework/types.ts instead of the barrel. That
 *    would eliminate the Playwright transitive dependency for all consumers.
 *
 * 3. Detox `device` global — PlatformDetector.isAndroid() calls
 *    device.getPlatform(), which requires Detox's global. We stub it
 *    since visual tests always target iOS simulators.
 */
const Module = require('module');
const path = require('path');

// --- Module redirects ---
const originalResolveFilename = Module._resolveFilename;

const nativeUtilsMock = path.resolve(
  __dirname,
  '../../../app/__mocks__/@metamask/native-utils.js',
);

// Playwright modules that use TypeScript decorators — stub with empty module.
// See note above for why this is needed and how to fix it upstream.
const stubbedModules = [
  'PlaywrightAdapter',
  'PlaywrightMatchers',
  'PlaywrightGestures',
];

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@metamask/native-utils') {
    return nativeUtilsMock;
  }
  const basename = path.basename(request).replace(/\.(ts|js)$/, '');
  if (stubbedModules.includes(basename)) {
    return path.resolve(__dirname, 'empty-stub.js');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// --- Stub Detox `device` global for PlatformDetector ---
global.device = { getPlatform: () => 'ios' };
