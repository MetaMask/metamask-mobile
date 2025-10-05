import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = path.resolve(__dirname, './run-e2e-tags-gha.mjs');

function makeTmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-tags-gha-'));
  const specsDir = path.join(root, 'e2e', 'specs');
  fs.mkdirSync(specsDir, { recursive: true });
  return { root, specsDir };
}

function writeFakeYarn(binDir: string, logPath: string) {
  fs.mkdirSync(binDir, { recursive: true });
  const yarnPath = path.join(binDir, 'yarn');
  const script = `#!/usr/bin/env node\nconst fs = require('fs');\nconst log = process.env.YARN_ARGS_LOG;\ntry { fs.writeFileSync(log, JSON.stringify(process.argv.slice(2), null, 2)); } catch (e) { /* ignore */ }\nprocess.exit(0);\n`;
  fs.writeFileSync(yarnPath, script, { mode: 0o755 });
  return yarnPath;
}

function runScript(cwd: string, env: Record<string, string>) {
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return result;
}

describe('run-e2e-tags-gha (black-box)', () => {
  it('selects files by tag with word boundaries and skips quarantine', () => {
    const { root, specsDir } = makeTmpWorkspace();
    // Files
    fs.writeFileSync(path.join(specsDir, 'alpha.spec.ts'), '// @tag-one\n');
    fs.writeFileSync(path.join(specsDir, 'beta.spec.ts'), '// @tag_two\n');
    fs.writeFileSync(path.join(specsDir, 'zeta.spec.ts'), 'atag-oneb\n'); // should NOT match
    fs.mkdirSync(path.join(specsDir, 'sub', 'quarantine'), { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'sub', 'delta.spec.js'), '/* @tag-one */\n');
    fs.writeFileSync(path.join(specsDir, 'sub', 'quarantine', 'epsilon.spec.ts'), '// @tag-one\n');

    const logPath = path.join(root, 'yarn-args-1.json');
    const binDir = path.join(root, 'bin');
    writeFakeYarn(binDir, logPath);

    const env = {
      PATH: `${binDir}:${process.env.PATH}`,
      TEST_SUITE_TAG: '@tag-one',
      PLATFORM: 'ios',
      METAMASK_BUILD_TYPE: 'main',
      YARN_ARGS_LOG: logPath,
      GITHUB_REPOSITORY: '', // avoid hitting GH GraphQL
    } as Record<string, string>;

    const result = runScript(root, env);
    expect(result.status).toBe(0);

    const args = JSON.parse(fs.readFileSync(logPath, 'utf8')) as string[];
    // First arg is the yarn script name
    expect(args[0]).toBe('test:e2e:ios:github:main:release');
    const files = args.slice(1).sort();
    expect(files).toEqual([
      path.join('e2e', 'specs', 'alpha.spec.ts'),
      path.join('e2e', 'specs', 'sub', 'delta.spec.js'),
    ].sort());
    // Ensure zeta and quarantine/epsilon were not selected
    expect(files.some((f) => f.endsWith('zeta.spec.ts'))).toBe(false);
    expect(files.some((f) => f.includes(`${path.sep}quarantine${path.sep}`))).toBe(false);
  });

  it('splits files across runners without overlap and keeps retries together', () => {
    const { root, specsDir } = makeTmpWorkspace();
    // Create base files
    const names = ['a.spec.ts', 'b.spec.ts', 'c.spec.ts', 'd.spec.ts', 'e.spec.ts'];
    for (const n of names) fs.writeFileSync(path.join(specsDir, n), '// @tag\n');
    // Create explicit retries for one of them
    fs.writeFileSync(path.join(specsDir, 'a-retry-1.spec.ts'), '// @tag\n');
    fs.writeFileSync(path.join(specsDir, 'a-retry-2.spec.ts'), '// @tag\n');

    const binDir = path.join(root, 'bin');

    const run = (splitNumber: number) => {
      const logPath = path.join(root, `yarn-args-s${splitNumber}.json`);
      writeFakeYarn(binDir, logPath);
      const env = {
        PATH: `${binDir}:${process.env.PATH}`,
        TEST_SUITE_TAG: '@tag',
        PLATFORM: 'ios',
        METAMASK_BUILD_TYPE: 'main',
        YARN_ARGS_LOG: logPath,
        TOTAL_SPLITS: '2',
        SPLIT_NUMBER: String(splitNumber),
        GITHUB_REPOSITORY: '',
      } as Record<string, string>;
      const res = runScript(root, env);
      expect(res.status).toBe(0);
      const args = JSON.parse(fs.readFileSync(logPath, 'utf8')) as string[];
      return args.slice(1); // drop yarn script name
    };

    const files1 = run(1);
    const files2 = run(2);

    // No overlap
    const set1 = new Set(files1);
    for (const f of files2) expect(set1.has(f)).toBe(false);

    // Union equals all matched files
    const union = new Set([...files1, ...files2]);
    const expectedAll = [
      path.join('e2e', 'specs', 'a.spec.ts'),
      path.join('e2e', 'specs', 'a-retry-1.spec.ts'),
      path.join('e2e', 'specs', 'a-retry-2.spec.ts'),
      path.join('e2e', 'specs', 'b.spec.ts'),
      path.join('e2e', 'specs', 'c.spec.ts'),
      path.join('e2e', 'specs', 'd.spec.ts'),
      path.join('e2e', 'specs', 'e.spec.ts'),
    ];
    expect([...union].sort()).toEqual(expectedAll.sort());

    // All a* files must be in the same split
    const in1 = files1.filter((f) => f.includes(`${path.sep}a`));
    const in2 = files2.filter((f) => f.includes(`${path.sep}a`));
    expect(in1.length === 0 || in2.length === 0).toBe(true);
  });

  it('duplicates changed spec with retries when quality gate not skipped', () => {
    const { root, specsDir } = makeTmpWorkspace();
    fs.writeFileSync(path.join(specsDir, 'dupme.spec.ts'), '// @dup\n');

    const logPath = path.join(root, 'yarn-args-dup.json');
    const binDir = path.join(root, 'bin');
    writeFakeYarn(binDir, logPath);

    const env = {
      PATH: `${binDir}:${process.env.PATH}`,
      TEST_SUITE_TAG: '@dup',
      PLATFORM: 'ios',
      METAMASK_BUILD_TYPE: 'main',
      YARN_ARGS_LOG: logPath,
      TOTAL_SPLITS: '1',
      SPLIT_NUMBER: '1',
      // Trigger duplication for changed spec
      CHANGED_FILES: path.join('e2e', 'specs', 'dupme.spec.ts'),
      // Avoid hitting GitHub API
      GITHUB_REPOSITORY: '',
    } as Record<string, string>;

    const res = runScript(root, env);
    expect(res.status).toBe(0);

    const args = JSON.parse(fs.readFileSync(logPath, 'utf8')) as string[];
    const files = args.slice(1).sort();
    expect(files).toEqual([
      path.join('e2e', 'specs', 'dupme.spec.ts'),
      path.join('e2e', 'specs', 'dupme-retry-1.spec.ts'),
      path.join('e2e', 'specs', 'dupme-retry-2.spec.ts'),
    ].sort());
  });
});
