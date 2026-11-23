import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, utimesSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setEnvFlag, nodeProblem, parseAdbDevices, findAdb, lanAddress, ensureCoreCodeowners,
  renderSkill, installSkill, probePort,
} from './setup.mjs';

test('setEnvFlag leaves an already enabled flag alone', () => {
  const text = 'export A="1"\nexport FOXY="true"\nexport B="2"\n';
  assert.deepEqual(setEnvFlag(text, 'FOXY', 'true'), { text, changed: false, how: 'unchanged' });
  assert.equal(setEnvFlag('export FOXY=true\n', 'FOXY', 'true').changed, false);
});

test('setEnvFlag switches a commented line on in place and keeps neighbours', () => {
  const text = '# export FOXY="true"\n# export FOXY_URL="ws://localhost:8098/app"\nexport KEEP="1"\n';
  const result = setEnvFlag(text, 'FOXY', 'true');
  assert.equal(result.how, 'uncommented');
  assert.equal(result.text, 'export FOXY="true"\n# export FOXY_URL="ws://localhost:8098/app"\nexport KEEP="1"\n');
});

test('setEnvFlag corrects a different value and keeps a trailing comment', () => {
  const result = setEnvFlag('export FOXY="false" # off\n', 'FOXY', 'true');
  assert.equal(result.how, 'updated');
  assert.equal(result.text, 'export FOXY="true" # off\n');
});

test('setEnvFlag does not mistake FOXY_URL or FOXY_BODIES for FOXY', () => {
  const text = 'export FOXY_URL="ws://x"\nexport FOXY_BODIES="true"\n';
  const result = setEnvFlag(text, 'FOXY', 'true');
  assert.equal(result.how, 'added');
  assert.ok(result.text.startsWith(text));
  assert.ok(result.text.trimEnd().endsWith('export FOXY="true"'));
  assert.ok(result.text.includes('FOXY_BODIES="true"'));
});

test('setEnvFlag appends to an empty or newline-less file, and keeps CRLF', () => {
  assert.equal(setEnvFlag('', 'FOXY', 'true').text.trimEnd().split('\n').pop(), 'export FOXY="true"');
  assert.ok(setEnvFlag('export A="1"', 'FOXY', 'true').text.includes('export A="1"\n'));
  const crlf = setEnvFlag('export A="1"\r\n', 'FOXY', 'true').text;
  assert.ok(crlf.includes('\r\n') && !/[^\r]\n/.test(crlf));
});

test('setEnvFlag is idempotent', () => {
  const once = setEnvFlag('export A="1"\n', 'FOXY', 'true').text;
  assert.equal(setEnvFlag(once, 'FOXY', 'true').changed, false);
});

test('nodeProblem only complains about a different major', () => {
  assert.equal(nodeProblem('v24.22.1', '^24.22.1'), null);
  assert.equal(nodeProblem('v24.3.0', '^24.22.1'), null);
  assert.match(nodeProblem('v20.11.0', '^24.22.1'), /expects \^24\.22\.1/);
  assert.equal(nodeProblem('v24.1.0', undefined), null);
});

test('parseAdbDevices keeps only ready devices', () => {
  const out = 'List of devices attached\nemulator-5554\tdevice\nR58M\toffline\nZX1\tunauthorized\n192.168.1.9:5555\tdevice\n\n';
  assert.deepEqual(parseAdbDevices(out), ['emulator-5554', '192.168.1.9:5555']);
  assert.deepEqual(parseAdbDevices('List of devices attached\n\n'), []);
});

test('findAdb prefers the SDK, then PATH, then nothing', () => {
  const exists = (p) => p === '/sdk/platform-tools/adb';
  assert.equal(findAdb({ env: { ANDROID_HOME: '/sdk' }, home: '/h', exists, onPath: () => false }), '/sdk/platform-tools/adb');
  assert.equal(findAdb({ env: {}, home: '/h', exists: () => false, onPath: () => true }), 'adb');
  assert.equal(findAdb({ env: {}, home: '/h', exists: () => false, onPath: () => false }), null);
});

test('lanAddress picks the first external IPv4', () => {
  assert.equal(lanAddress({
    lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    en0: [{ family: 'IPv6', internal: false, address: 'fe80::1' }, { family: 'IPv4', internal: false, address: '192.168.1.20' }],
  }), '192.168.1.20');
  assert.equal(lanAddress({ lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }] }), null);
});

test('ensureCoreCodeowners: sibling, download, cache, and offline', async () => {
  const root = mkdtempSync(join(tmpdir(), 'foxy-core-'));
  const repo = join(root, 'app');
  mkdirSync(repo);
  const cacheDir = join(root, 'cache');
  const ok = async () => ({ ok: true, text: async () => '* @MetaMask/core-team\n' });
  const offline = async () => { throw new Error('offline'); };

  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: offline })).source, 'missing');
  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: offline, dryRun: true })).source, 'missing');
  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: ok })).source, 'downloaded');
  assert.equal(readFileSync(join(cacheDir, '.github', 'CODEOWNERS'), 'utf8'), '* @MetaMask/core-team\n');
  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: offline })).source, 'cache');

  // stale cache: a failed refresh still uses the old copy
  const file = join(cacheDir, '.github', 'CODEOWNERS');
  const old = new Date(Date.now() - 8 * 24 * 3600 * 1000);
  utimesSync(file, old, old);
  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: offline })).source, 'cache');

  mkdirSync(join(root, 'core', '.github'), { recursive: true });
  writeFileSync(join(root, 'core', '.github', 'CODEOWNERS'), '');
  assert.equal((await ensureCoreCodeowners({ repo, cacheDir, fetchImpl: offline })).source, 'sibling');
});

test('renderSkill drops maturity and marks the file as generated', () => {
  const out = renderSkill('---\nname: foxy\ndescription: Hi\nmaturity: experimental\n---\n\n# Foxy\n');
  assert.ok(out.startsWith('---\nname: foxy\ndescription: Hi\n---\n<!-- Generated'));
  assert.ok(!out.includes('maturity'));
  assert.ok(out.endsWith('# Foxy\n'));
});

test('installSkill writes every target once and then reports them current', () => {
  const root = mkdtempSync(join(tmpdir(), 'foxy-skill-'));
  const source = join(root, 'skill.md');
  writeFileSync(source, '---\nname: foxy\ndescription: Hi\nmaturity: experimental\n---\n# Foxy\n');
  const dry = installSkill({ repo: root, source, dryRun: true });
  assert.equal(dry.written.length, 3);
  assert.equal(existsSync(join(root, '.claude')), false);

  const first = installSkill({ repo: root, source });
  assert.deepEqual(first.written, ['.claude/skills', '.agents/skills', '.cursor/skills']);
  for (const dir of first.written) assert.ok(readFileSync(join(root, dir, 'foxy', 'SKILL.md'), 'utf8').includes('name: foxy'));

  const second = installSkill({ repo: root, source });
  assert.deepEqual(second.written, []);
  assert.equal(second.current.length, 3);

  writeFileSync(source, '---\nname: foxy\ndescription: Changed\n---\n# Foxy\n');
  assert.equal(installSkill({ repo: root, source }).written.length, 3);
  assert.equal(installSkill({ repo: root, source: join(root, 'nope.md') }).missing, true);
});

test('the shipped skill has the frontmatter the installers need', () => {
  const text = readFileSync(new URL('./skill/skill.md', import.meta.url), 'utf8');
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(front, /^name: foxy$/m);
  const description = front.match(/^description: (.*)$/m)[1];
  assert.ok(description.length > 40 && description.length <= 1536);
  assert.ok(renderSkill(text).includes('name: foxy'));
});

test('probePort tells a free port from one in use', async () => {
  const holder = createServer();
  await new Promise((resolve) => holder.listen(0, resolve));
  const { port } = holder.address();
  assert.equal(await probePort(port, async () => { throw new Error('not http'); }), 'busy');
  assert.equal(await probePort(port, async () => ({ json: async () => ({ sessions: [] }) })), 'foxy');
  await new Promise((resolve) => holder.close(resolve));
  assert.equal(await probePort(port), 'free');
});
