import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseCodeowners,
  ownersFor,
  loadCodeowners,
  resolveFrameOwners,
} from './codeowners.mjs';

const rules = parseCodeowners(`
# comment
app/component-library/               @MetaMask/design-system-engineers
/android/                            @MetaMask/mobile-platform
app/core/Engine/Engine.ts            @MetaMask/mobile-platform
*.snap                               @MetaMask/qa
app/components/UI/Ramp/              @MetaMask/ramps   # trailing comment
app/components/UI/Ramp/debug/        @MetaMask/money-movement @MetaMask/ramps
docs/**/*.md                         @MetaMask/docs
`);

test('directory patterns own everything below them; last match wins', () => {
  assert.deepEqual(ownersFor(rules, 'app/component-library/Texts/Text.tsx'), ['@MetaMask/design-system-engineers']);
  assert.deepEqual(ownersFor(rules, 'app/components/UI/Ramp/Buy.tsx'), ['@MetaMask/ramps']);
  assert.deepEqual(ownersFor(rules, 'app/components/UI/Ramp/debug/Bridge.ts'), ['@MetaMask/money-movement', '@MetaMask/ramps']);
});

test('anchored vs unanchored, exact files and globs', () => {
  assert.deepEqual(ownersFor(rules, 'android/app/build.gradle'), ['@MetaMask/mobile-platform']);
  assert.equal(ownersFor(rules, 'foo/android/x'), null); // `/android/` is anchored
  assert.deepEqual(ownersFor(rules, 'app/core/Engine/Engine.ts'), ['@MetaMask/mobile-platform']);
  assert.deepEqual(ownersFor(rules, 'a/b/__snapshots__/x.snap'), ['@MetaMask/qa']); // basename glob at any depth
  assert.deepEqual(ownersFor(rules, 'docs/a/b/readme.md'), ['@MetaMask/docs']);
  assert.equal(ownersFor(rules, 'nothing/here.ts'), null);
});

test('resolveFrameOwners maps app -> repo rules and @metamask/<pkg> -> core packages/<pkg>', () => {
  const coreRules = parseCodeowners(`
/packages/assets-controllers  @MetaMask/metamask-assets
/packages/core-backend        @MetaMask/metamask-assets
`);
  const ctx = { repoRules: rules, coreRules };
  assert.deepEqual(
    resolveFrameOwners({ kind: 'app', shortPath: 'app/core/Engine/Engine.ts' }, ctx).owners,
    ['@MetaMask/mobile-platform'],
  );
  assert.deepEqual(
    resolveFrameOwners({ kind: 'controller', shortPath: '@metamask/core-backend/dist/api/base-client.js' }, ctx).owners,
    ['@MetaMask/metamask-assets'],
  );
  assert.equal(resolveFrameOwners({ kind: 'package', shortPath: 'axios/lib/x.js' }, ctx).source, 'third-party');
  assert.equal(resolveFrameOwners({ kind: 'controller', shortPath: '@metamask/stake-sdk/dist/x.cjs' }, ctx).owners, null);
});

// Sanity check against the real files when present (skipped otherwise).
const here = dirname(fileURLToPath(import.meta.url));
const mobile = join(here, '..', '..', '.github', 'CODEOWNERS');
const core = join(here, '..', '..', '..', 'core', '.github', 'CODEOWNERS');

test('real mobile CODEOWNERS: design system and Engine.ts', { skip: !existsSync(mobile) }, () => {
  const real = loadCodeowners(mobile);
  assert.deepEqual(ownersFor(real, 'app/component-library/components/Texts/Text/Text.tsx'), ['@MetaMask/design-system-engineers']);
  assert.deepEqual(ownersFor(real, 'app/core/Engine/Engine.ts'), ['@MetaMask/mobile-platform']);
});

test('real core CODEOWNERS: assets-controllers', { skip: !existsSync(core) }, () => {
  const real = loadCodeowners(core);
  assert.deepEqual(ownersFor(real, 'packages/assets-controllers/src/index.ts'), ['@MetaMask/metamask-assets']);
});
