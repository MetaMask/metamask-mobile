#!/usr/bin/env node
// Bootstrap for the mm-mobile daemon.
//
// The daemon process runs under `tsx` (esbuild) which transforms every JS/TS
// file it encounters.  Several @metamask packages transitively depend on
// react-native and react-native-nitro-modules whose source files contain Flow
// syntax that esbuild cannot parse.
//
// This CJS entry point registers a Module._resolveFilename hook that redirects
// those imports to lightweight stubs BEFORE any application code is evaluated.
// After the hooks are in place the real daemon module is loaded via dynamic
// import().
'use strict';

const Module = require('node:module');
const path = require('node:path');

const STUBS_DIR = path.join(__dirname, 'stubs');

const REDIRECT_MAP = {
  'react-native': path.join(STUBS_DIR, 'react-native.cjs'),
  'react-native-nitro-modules': path.join(STUBS_DIR, 'react-native-nitro-modules.cjs'),
};

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  // Exact match or sub-path (e.g. "react-native/Libraries/...")
  for (const [pkg, stubPath] of Object.entries(REDIRECT_MAP)) {
    if (request === pkg || request.startsWith(pkg + '/')) {
      return stubPath;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// Load the real daemon.  Dynamic import() is fine here — the hooks above are
// already synchronously registered so any transitive require() inside daemon.ts
// (or its capability modules) will hit the stubs.
import('./daemon.ts').catch((err) => {
  process.stderr.write(`daemon-entry: failed to load daemon.ts: ${err.message}\n`);
  process.exit(1);
});
