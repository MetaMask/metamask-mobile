import { readFileSync } from 'node:fs';
import path from 'node:path';

import { stripJsonComments } from './json-tools.mts';
import { classifyFailureText } from './classify-failure-text.mts';

type RetryPatterns = {
  deterministicErrorPatterns: string[];
  transientErrorPatterns: string[];
};

const config = JSON.parse(
  stripJsonComments(
    readFileSync(
      path.join(__dirname, '../../rules/retry-config.jsonc'),
      'utf8',
    ),
  ),
) as RetryPatterns;

function classify(log: string) {
  return classifyFailureText(log, config);
}

describe('classifyFailureText', () => {
  it('classifies a Gradle daemon crash when the log also says BUILD FAILED', () => {
    const log = [
      'FAILURE: Build failed with an exception.',
      '* What went wrong:',
      'Gradle build daemon disappeared unexpectedly (crash)',
      'BUILD FAILED in 3m 12s',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('transient');
    expect(result.match).toMatch(/Gradle build daemon disappeared/i);
  });

  it('classifies an unresolved Gradle dependency when the log also says BUILD FAILED', () => {
    const log = [
      'FAILURE: Build failed with an exception.',
      "Could not resolve all dependencies for configuration ':app:debugCompileClasspath'.",
      'BUILD FAILED in 45s',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('transient');
    expect(result.match).toMatch(/Could not resolve all dependencies/i);
  });

  it('classifies an xcodebuild timeout when the log also says BUILD FAILED', () => {
    const log = [
      '** BUILD FAILED **',
      'xcodebuild: error: timeout waiting for the destination',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('transient');
    expect(result.match).toMatch(/xcodebuild: error: timeout/i);
  });

  it('classifies a Jest timeout when the summary says suites and tests failed', () => {
    const log = [
      'Exceeded timeout of 5000 ms for a test.',
      'Test Suites: 1 failed, 0 passed, 1 total',
      'Tests:       1 failed, 0 passed, 1 total',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('transient');
    expect(result.match).toBe('Exceeded timeout of 5000 ms for a test');
  });

  it('classifies a Jest worker failure when the summary says tests failed', () => {
    const log = [
      'Jest worker encountered 4 child process exceptions',
      'Test Suites: 1 failed, 2 passed, 3 total',
      'Tests:       2 failed, 20 passed, 22 total',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('transient');
    expect(result.match).toBe('Jest worker encountered');
  });

  it('classifies TypeError: fetch failed as transient', () => {
    const result = classify('TypeError: fetch failed');

    expect(result).toEqual({
      outcome: 'transient',
      match: 'TypeError: fetch failed',
    });
  });

  it('classifies TypeError: Failed to fetch as transient', () => {
    const result = classify('TypeError: Failed to fetch');

    expect(result.outcome).toBe('transient');
    expect(result.match).toMatch(/TypeError: Failed to fetch/i);
  });

  it('classifies a code TypeError as deterministic when a Jest timeout is also present', () => {
    const log = [
      'TypeError: Cannot read properties of undefined (reading "foo")',
      'Exceeded timeout of 5000 ms for a test.',
    ].join('\n');

    const result = classify(log);

    expect(result).toEqual({ outcome: 'deterministic', match: 'TypeError:' });
  });

  it('classifies an assertion failure as deterministic when the Jest summary is also present', () => {
    const log = [
      'expect(received).toBe(expected)',
      'Tests:       1 failed, 10 passed, 11 total',
      'Test Suites: 1 failed, 2 passed, 3 total',
    ].join('\n');

    const result = classify(log);

    expect(result.outcome).toBe('deterministic');
    expect(result.match).toBe('expect(received).toBe(expected)');
  });

  it('classifies a TypeScript error as deterministic', () => {
    const result = classify('app/App.tsx(10,5): error TS2322: Type "string" is not assignable.');

    expect(result.outcome).toBe('deterministic');
    expect(result.match).toMatch(/error TS2322:/);
  });

  it('classifies a SonarCloud quality gate failure as deterministic', () => {
    const result = classify('Quality Gate failed');

    expect(result).toEqual({
      outcome: 'deterministic',
      match: 'Quality Gate failed',
    });
  });

  it('classifies a JS bundle baseline failure as deterministic', () => {
    const result = classify('JS bundle exceeds baseline by 12kb');

    expect(result.outcome).toBe('deterministic');
    expect(result.match).toBe('JS bundle exceeds baseline');
  });

  it('leaves a Gradle BUILD FAILED summary unclassified when no transient error is present', () => {
    const result = classify('BUILD FAILED in 3m 12s');

    expect(result).toEqual({ outcome: 'none' });
  });

  it('leaves a Jest failure summary unclassified when no assertion or timeout is present', () => {
    const log = [
      'Test Suites: 1 failed, 0 passed, 1 total',
      'Tests:       1 failed, 0 passed, 1 total',
    ].join('\n');

    const result = classify(log);

    expect(result).toEqual({ outcome: 'none' });
  });
});
