#!/usr/bin/env node
// compute-cache-fp.js — agentic-local native-build fingerprint for the
// shared build cache.
//
// Why a separate fingerprint script:
// The repo-wide `scripts/generate-fingerprint.js` uses the project's
// `fingerprint.config.js`, which is the right configuration for EAS Build,
// EAS Update, OTA fingerprint guards, and other shared CI consumers — it
// intentionally hashes everything that could conceivably influence the
// built binary, including some local build outputs (`ios/build/`,
// `.gradle/`, IDE state, env-populated xcconfig files, etc.).
//
// For the agentic build cache that backs `--mode auto`, we want a *narrower*
// key that ignores per-worktree build artifacts so two slots on the same
// commit with the same native dep graph hash to the same value and can
// share a single cached `.app`/`.apk`. Modifying the shared config to do
// this would change the hash every other EAS/OTA tool depends on, which we
// don't want.
//
// This script writes the agentic-only fingerprint to stdout. It does not
// load `fingerprint.config.js`. `bc_fingerprint` invokes it instead of the
// project-wide script.

const fp = require('@expo/fingerprint');

const options = {
  // Match the project config's extra inputs so anything that genuinely
  // affects the native build still participates in the key.
  extraSources: [
    { type: 'dir', filePath: '.yarn/patches', reasons: ['Detect yarn patch changes.'] },
    { type: 'dir', filePath: '.github/workflows', reasons: ['Detect Github workflow changes.'] },
    { type: 'dir', filePath: '.github/scripts', reasons: ['Detect Github workflow script changes.'] },
    { type: 'file', filePath: 'react-native.config.js', reasons: ['Detect react-native.config.js changes.'] },
    { type: 'file', filePath: './scripts/build.sh', reasons: ['Detect build configuration changes.'] },
    { type: 'file', filePath: './scripts/setup.mjs', reasons: ['Detect setup script changes.'] },
  ],
  // Skip per-worktree dev/build state that doesn't affect the produced
  // binary semantics. All are gitignored and regenerated locally.
  ignorePaths: [
    'ios/build/**',
    'ios/*.xcconfig',
    'ios/.xcode.env.local',
    'ios/MetaMask.xcworkspace/xcshareddata/swiftpm/**',
    'ios/**/xcuserdata/**',
    'android/.gradle/**',
    'android/app/.cxx/**',
    'android/app/build/**',
    'android/app/google-services.json',
    'android/app/src/main/assets/InpageBridgeWeb3.js',
  ],
};

fp.createFingerprintAsync(process.cwd(), options)
  .then(({ hash }) => {
    process.stdout.write(hash);
  })
  .catch((err) => {
    process.stderr.write(`compute-cache-fp: ${err.message}\n`);
    process.exit(1);
  });
