#!/usr/bin/env node
// compute-cache-fp.js — agentic-local native-build fingerprint for the
// shared build cache.
//
// Relation to the project fingerprint:
// The repo-wide `scripts/generate-fingerprint.js` is consumed by EAS Build,
// EAS Update, and the OTA fingerprint guard in
// `docs/nightly-ota-updates.md`. Its `fingerprint.config.js` deliberately
// errs on the side of hashing too much — every local build artifact that
// could conceivably influence the produced binary participates in the key
// so a hash collision can never reuse a build whose inputs we cannot
// vouch for.
//
// `@expo/fingerprint`'s `createFingerprintAsync(projectRoot, options)`
// loads `fingerprint.config.js` and then merges in the caller's options
// with these semantics (per `@expo/fingerprint` 0.15.x):
// - `extraSources`: caller fully OVERRIDES the config's list when set.
//   We therefore repeat the project's six extraSources verbatim plus
//   `app/core/InpageBridgeWeb3.js` so nothing the project fingerprint
//   tracked is silently dropped.
// - `ignorePaths`: caller is MERGED with the config's list. Our entries
//   layer on top of whatever fingerprint.config.js declares.
// Our added ignorePaths cover per-worktree dev/build artifacts that
// don't affect binary semantics (compile outputs, IDE state, NDK cache,
// per-machine `.xcode.env.local`).
// Binary-affecting inputs — env-populated xcconfig, `google-services.json`,
// the bridge source — stay hashed. The cache only converges across
// worktrees when those inputs match, which is the correct behaviour.

const fp = require('@expo/fingerprint');

const options = {
  // Mirror fingerprint.config.js extraSources verbatim (since options
  // override config, we must repeat them) and append the bridge source.
  extraSources: [
    { type: 'dir', filePath: '.yarn/patches', reasons: ['Detect yarn patch changes.'] },
    { type: 'dir', filePath: '.github/workflows', reasons: ['Detect Github workflow changes.'] },
    { type: 'dir', filePath: '.github/scripts', reasons: ['Detect Github workflow script changes.'] },
    { type: 'file', filePath: 'react-native.config.js', reasons: ['Detect react-native.config.js changes.'] },
    { type: 'file', filePath: './scripts/build.sh', reasons: ['Detect build configuration changes.'] },
    { type: 'file', filePath: './scripts/setup.mjs', reasons: ['Detect setup script changes.'] },
    {
      type: 'file',
      filePath: 'app/core/InpageBridgeWeb3.js',
      reasons: ['Bundled into the runtime JS — affects binary behaviour.'],
    },
  ],
  // Per-worktree dev/build state that does not influence the produced
  // binary. All are gitignored and regenerated locally; ignoring them
  // lets two slots on the same commit with the same source env share a
  // cached `.app`/`.apk`.
  ignorePaths: [
    'ios/build/**',
    'ios/.xcode.env.local',
    'ios/MetaMask.xcworkspace/xcshareddata/swiftpm/**',
    'ios/**/xcuserdata/**',
    'android/.gradle/**',
    'android/app/.cxx/**',
    'android/app/build/**',
    // Mirror of app/core/InpageBridgeWeb3.js — already tracked via the
    // extraSources entry above; ignore the generated copy so we don't
    // double-count it on rebuild.
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
