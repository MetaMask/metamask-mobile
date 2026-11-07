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

  if (binNames.length > 0) {
    const binDir = path.join(root, 'node_modules', '.bin');
    fs.mkdirSync(binDir, { recursive: true });
    for (const binName of binNames) {
      const binPath = path.join(binDir, binName);
      fs.writeFileSync(binPath, "#!/bin/sh\nprintf 'sentinel\\n'\n");
      fs.chmodSync(binPath, 0o755);
    }
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
      '{"permission":"allow"}\n',
    );
    expect(runHook(root, 'hook-cursor-prompt.sh')).toBe(
      '{"permission":"allow"}\n',
    );
  });

  it('runs the Cursor collector when it is executable', () => {
    const root = installFixture([
      'tooling-insight-cursor-pre-tool',
      'tooling-insight-cursor-prompt',
    ]);
    roots.push(root);

    expect(runHook(root, 'hook-cursor-pre-tool.sh')).toBe('sentinel\n');
    expect(runHook(root, 'hook-cursor-prompt.sh')).toBe('sentinel\n');
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
  });
});
