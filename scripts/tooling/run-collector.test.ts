import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SOURCE_DIR = __dirname;
const HOOK_FILES = [
  'run-collector.sh',
  'hook-cursor-pre-tool.sh',
  'hook-cursor-prompt.sh',
  'hook-claude.sh',
] as const;

const ALLOW_RESPONSE = '{"permission":"allow"}\n';

function binPath(root: string, binName: string): string {
  return path.join(root, 'node_modules', '.bin', binName);
}

function installFixture(binNames: string[] = []): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tooling-insight-hook-'),
  );
  const toolingDir = path.join(root, 'scripts', 'tooling');
  fs.mkdirSync(toolingDir, { recursive: true });

  for (const name of HOOK_FILES) {
    const destination = path.join(toolingDir, name);
    fs.copyFileSync(path.join(SOURCE_DIR, name), destination);
    fs.chmodSync(destination, 0o755);
  }

  for (const binName of binNames) {
    const bin = binPath(root, binName);
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    fs.writeFileSync(
      bin,
      `#!/bin/sh
touch "${bin}.executed"
printf 'sentinel\\n'
`,
    );
    fs.chmodSync(bin, 0o755);
  }

  return root;
}

function runHook(root: string, scriptName: string): string {
  return execFileSync(
    '/bin/sh',
    [path.join(root, 'scripts', 'tooling', scriptName)],
    { encoding: 'utf8', input: '{}' },
  );
}

describe('tooling-insight hook scripts', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prints an allow decision when a Cursor collector is not executable', () => {
    const root = installFixture();
    roots.push(root);

    expect(runHook(root, 'hook-cursor-pre-tool.sh')).toBe(
      ALLOW_RESPONSE,
    );
    expect(runHook(root, 'hook-cursor-prompt.sh')).toBe(
      ALLOW_RESPONSE,
    );
  });

  it('runs Cursor collectors without exposing their stdout', () => {
    const root = installFixture([
      'tooling-insight-cursor-pre-tool',
      'tooling-insight-cursor-prompt',
    ]);
    roots.push(root);

    const hooks = [
      ['hook-cursor-pre-tool.sh', 'tooling-insight-cursor-pre-tool'],
      ['hook-cursor-prompt.sh', 'tooling-insight-cursor-prompt'],
    ] as const;

    for (const [hook, binName] of hooks) {
      expect(runHook(root, hook)).toBe(ALLOW_RESPONSE);
      expect(
        fs.existsSync(`${binPath(root, binName)}.executed`),
      ).toBe(true);
    }
  });

  it('allows Cursor actions even when a collector fails', () => {
    const root = installFixture([
      'tooling-insight-cursor-pre-tool',
    ]);
    roots.push(root);

    const bin = binPath(root, 'tooling-insight-cursor-pre-tool');
    fs.writeFileSync(
      bin,
      `#!/bin/sh
touch "${bin}.executed"
printf 'unexpected output\\n'
exit 1
`,
    );

    expect(runHook(root, 'hook-cursor-pre-tool.sh')).toBe(
      ALLOW_RESPONSE,
    );
    expect(fs.existsSync(`${bin}.executed`)).toBe(true);
  });

  it('exits quietly when the Claude collector is not executable', () => {
    const root = installFixture();
    roots.push(root);

    expect(runHook(root, 'hook-claude.sh')).toBe('');
  });

  it('runs the Claude collector when it is executable', () => {
    const root = installFixture(['tooling-insight-claude']);
    roots.push(root);

    expect(runHook(root, 'hook-claude.sh')).toBe('sentinel\n');
    expect(
      fs.existsSync(
        `${binPath(root, 'tooling-insight-claude')}.executed`,
      ),
    ).toBe(true);
  });
});
