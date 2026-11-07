/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadScenario } from '../../../framework/scenario';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SCENARIO_DIR = __dirname;
const SPEC_PATH =
  'tests/performance/login/scenarios/eth-swap-flow.scenario.spec.ts';

/** Same grep as tests/playwright.testmu.config.ts and tests/playwright.config.ts. */
const PERFORMANCE_CONFIG_GREP = /@Performance\b/;

describe('scenario shadow specs stay out of performance CI', () => {
  it('are not listed by HyperExecute discovery', () => {
    const discovered = execFileSync(
      'bash',
      [
        '.github/scripts/qa-automation/performance-tests/hyperexecute-discover-performance-tests.sh',
      ],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, BUILD_TYPE: 'imported-wallet' },
        encoding: 'utf8',
      },
    )
      .trim()
      .split('\n');

    expect(discovered).toContain(
      'tests/performance/login/eth-swap-flow.spec.ts',
    );
    expect(discovered).not.toContain(SPEC_PATH);
    expect(discovered.some((file) => file.includes('/scenarios/'))).toBe(false);
  });

  it('keep the opt-in shadow config out of every workflow and CI script', () => {
    const ciDirs = ['.github/workflows', '.github/scripts'];
    const referencing: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (
          fs.readFileSync(fullPath, 'utf8').includes('scenario-shadow')
        ) {
          referencing.push(path.relative(REPO_ROOT, fullPath));
        }
      }
    };
    ciDirs.forEach((dir) => walk(path.join(REPO_ROOT, dir)));

    expect(referencing).toEqual([]);
  });

  it('use tags and titles that the performance and system greps do not match', () => {
    const scenarioFiles = fs
      .readdirSync(SCENARIO_DIR)
      .filter((name) => name.endsWith('.scenario.yaml'));
    expect(scenarioFiles.length).toBeGreaterThan(0);

    for (const file of scenarioFiles) {
      const { scenario } = loadScenario(path.join(SCENARIO_DIR, file));
      const grepTarget = `${scenario.tags.join(' ')} ${scenario.title} ${scenario.team}`;
      expect(PERFORMANCE_CONFIG_GREP.test(grepTarget)).toBe(false);
      expect(/@System/.test(grepTarget)).toBe(false);
    }
  });
});
