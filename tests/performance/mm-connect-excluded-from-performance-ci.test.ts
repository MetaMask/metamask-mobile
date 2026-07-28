/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

const listMmConnectSpecFiles = (): string[] => {
  const dir = path.join(REPO_ROOT, 'tests/smoke-appium/mm-connect');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => path.join(dir, name));
};

describe('MMConnect excluded from performance CI', () => {
  it('removes the performance mm-connect suite directory', () => {
    const performanceMmConnectDir = path.join(
      REPO_ROOT,
      'tests/performance/mm-connect',
    );

    expect(fs.existsSync(performanceMmConnectDir)).toBe(false);
  });

  it('keeps MMConnect specs under Appium smoke only', () => {
    const smokeMmConnectDir = path.join(
      REPO_ROOT,
      'tests/smoke-appium/mm-connect',
    );

    expect(fs.existsSync(smokeMmConnectDir)).toBe(true);
    expect(listMmConnectSpecFiles().length).toBeGreaterThan(0);
  });

  it('omits mm-connect Playwright projects from the performance config', () => {
    const playwrightConfig = readRepoFile('tests/playwright.config.ts');

    expect(playwrightConfig).toMatch(/grep:\s*\/@Performance\//);
    expect(playwrightConfig).not.toMatch(/name:\s*'mm-connect-/);
    expect(playwrightConfig).not.toContain('performance/mm-connect');
    expect(playwrightConfig).not.toContain('smoke-appium/mm-connect');
  });

  it('omits performance yarn entrypoints for mm-connect', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const performanceMmConnectScripts = Object.keys(packageJson.scripts).filter(
      (name) => name.startsWith('run-playwright:mm-connect'),
    );

    expect(performanceMmConnectScripts).toEqual([]);
    expect(packageJson.scripts['appium-smoke:mmconnect:android']).toContain(
      'SmokeMMConnect',
    );
  });

  it('omits mm-connect jobs from the performance E2E workflow', () => {
    const workflow = readRepoFile('.github/workflows/run-performance-e2e.yml');

    expect(workflow).not.toContain('run-android-mm-connect-tests');
    expect(workflow).not.toContain(
      'fetch-rn-playground-apk-upload-to-browserstack',
    );
    expect(workflow).not.toContain('android_mm_connect_matrix');
    expect(workflow).not.toContain('build_type: mm-connect');
  });

  it('omits mm-connect branches from the performance test runner', () => {
    const runner = readRepoFile(
      '.github/workflows/performance-test-runner.yml',
    );

    expect(runner).not.toContain('mm-connect');
    expect(runner).not.toContain('browserstack_playground_url');
    expect(runner).not.toContain('BROWSERSTACK_RN_PLAYGROUND_URL');
  });

  it('tags smoke MMConnect specs with SmokeMMConnect instead of @Performance', () => {
    const specFiles = listMmConnectSpecFiles();

    expect(specFiles.length).toBeGreaterThan(0);

    for (const specPath of specFiles) {
      const contents = fs.readFileSync(specPath, 'utf8');

      expect(contents).toContain("from '../../tags.js'");
      expect(contents).toContain('SmokeMMConnect');
      expect(contents).not.toContain('tags.performance');
      expect(contents).not.toContain('@Performance');
    }
  });
});
