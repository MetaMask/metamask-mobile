import fs from 'node:fs';
import path from 'node:path';
import {
  buildRunArgs,
  describeJestScript,
  selectSuites,
  splitShellWords,
} from './jest-related-plan.mjs';

const readScripts = (): Record<string, string> =>
  JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
  ).scripts;

describe('splitShellWords', () => {
  it('keeps a quoted word that contains pipes and spaces as one word', () => {
    const words = splitShellWords(`jest ./app/ --flag='a|b c' "--other=d e"`);

    expect(words).toEqual(['jest', './app/', '--flag=a|b c', '--other=d e']);
  });

  it('throws when a quote is not closed', () => {
    expect(() => splitShellWords(`jest --flag='a`)).toThrow('Unterminated');
  });
});

describe('describeJestScript', () => {
  it('keeps only the flags of a script that calls jest with positional roots', () => {
    const result = describeJestScript(
      'test:x',
      `jest ./app/ ./tests/**/*.test.ts --testPathIgnorePatterns='a|b' --silent`,
    );

    expect(result).toEqual({
      direct: true,
      base: ['jest', '--testPathIgnorePatterns=a|b', '--silent'],
    });
  });

  it('calls a wrapper script through yarn unchanged', () => {
    const result = describeJestScript(
      'test:view:ci',
      'TEST_OS=ios yarn test:view:coverage --forceExit',
    );

    expect(result).toEqual({ direct: false, base: ['test:view:ci'] });
  });

  it('carries the ignore patterns of the real test:unit script', () => {
    const { base } = describeJestScript(
      'test:unit',
      readScripts()['test:unit'],
    );

    expect(base).toHaveLength(2);
    expect(base[0]).toBe('jest');
    expect(base[1]).toMatch(/^--testPathIgnorePatterns=.*tests\/smoke-appium/u);
  });

  it('treats the real view and integration scripts as wrappers without roots', () => {
    const scripts = readScripts();

    const view = describeJestScript('test:view:ci', scripts['test:view:ci']);
    const integration = describeJestScript(
      'test:integration:ci',
      scripts['test:integration:ci'],
    );

    expect(view.direct).toBe(false);
    expect(integration.direct).toBe(false);
  });
});

describe('selectSuites', () => {
  it('drops related files that the full run would not run and sorts the rest', () => {
    const all = ['/r/b.test.ts', '/r/a.test.ts'];
    const related = ['/r/b.test.ts', '/r/tests/performance/x.spec.ts', '/r/b.test.ts'];

    expect(selectSuites(related, all)).toEqual(['/r/b.test.ts']);
  });
});

describe('buildRunArgs', () => {
  const direct = { direct: true, base: ['jest', '--silent'] };

  it('runs the selected suites by path with the caller flags', () => {
    const args = buildRunArgs('test:unit', ['--shard=1/2'], ['/r/a.test.ts'], 5, direct);

    expect(args).toEqual([
      'jest',
      '--silent',
      '--shard=1/2',
      '--passWithNoTests',
      '--runTestsByPath',
      '/r/a.test.ts',
    ]);
  });

  it('points at a path that matches nothing when no suite is selected', () => {
    const args = buildRunArgs('test:unit', [], [], 5, direct);

    expect(args.slice(-2)[0]).toBe('--runTestsByPath');
    expect(path.basename(args[args.length - 1])).toBe(
      '.jest-related-no-matching-suite',
    );
  });

  it('runs the plain script when every suite is selected', () => {
    const args = buildRunArgs('test:unit', ['--shard=1/2'], ['/r/a.test.ts'], 1, direct);

    expect(args).toEqual(['test:unit', '--shard=1/2']);
  });

  it('falls back to the plain script when the argument list would be too long', () => {
    const selected = Array.from({ length: 20000 }, (_, i) => `/r/${'x'.repeat(100)}${i}.test.ts`);

    const args = buildRunArgs('test:unit', [], selected, 30000, direct);

    expect(args).toEqual(['test:unit']);
  });
});
