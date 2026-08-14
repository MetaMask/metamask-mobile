#!/usr/bin/env node
// Bootstrap for the mm-mobile daemon.
//
// The daemon process runs under `tsx` (esbuild) which transforms every JS/TS
// file it encounters.  Several @metamask packages transitively depend on
// react-native and react-native-nitro-modules whose source files contain Flow
// syntax that esbuild cannot parse.
//
// Two layers of defence keep the module graph intact:
//
// 1. nodeNativeUtilsShim — intercepts `require('@metamask/native-utils')` at
//    the Module._load level, returning real JS implementations (via
//    @noble/curves) instead of the native C++ module.  This is the primary
//    fix: the Yarn-patched @ethereumjs/util replaces pubToAddress with
//    `require('@metamask/native-utils').pubToAddress`, which would otherwise
//    pull in react-native-nitro-modules → react-native.  With the shim in
//    place the downstream chain never fires, and functions like pubToAddress
//    return correct values instead of silent noops.
//
// 2. Module._resolveFilename stubs — a safety net that redirects any
//    remaining react-native / react-native-nitro-modules imports (from
//    unknown transitive paths) to lightweight stubs so esbuild never
//    encounters Flow syntax.
'use strict';

const Module = require('node:module');
const path = require('node:path');

// Layer 1: real JS fallbacks for @metamask/native-utils (must run first).
require('../../tests/framework/nodeNativeUtilsShim.cjs');

// Layer 2: filename-level redirects for react-native packages.
const STUBS_DIR = path.join(__dirname, 'stubs');

const REDIRECT_MAP = {
  'react-native': path.join(STUBS_DIR, 'react-native.cjs'),
  'react-native-nitro-modules': path.join(STUBS_DIR, 'react-native-nitro-modules.cjs'),
};

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  for (const [pkg, stubPath] of Object.entries(REDIRECT_MAP)) {
    if (request === pkg || request.startsWith(pkg + '/')) {
      return stubPath;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// Load the real daemon.  Dynamic import() is fine here — both hooks above are
// already synchronously registered so any transitive require() inside daemon.ts
// (or its capability modules) will hit the shim / stubs.
import('./daemon.ts').catch((err) => {
  process.stderr.write(`daemon-entry: failed to load daemon.ts: ${err.message}\n`);
  process.exit(1);
});
