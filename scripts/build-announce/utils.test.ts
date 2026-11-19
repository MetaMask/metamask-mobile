import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readTestPlan } from './utils';
import type { TestPlanResult } from './types';

const testPlan: TestPlanResult = {
  prNumber: 123,
  prTitle: 'Release 7.71.0',
  generatedAt: '2026-10-21T00:00:00.000Z',
  model: 'test-model',
  summary: {
    totalFiles: 1,
    highImpactFiles: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    releaseRiskScore: 'low',
  },
  scenarios: [],
  signOffs: { signedOff: [], needsAttention: [] },
};

describe('readTestPlan', () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'build-announce-'));
    filePath = join(dir, 'release-test-plan.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns the test plan with the release version when generation succeeded', () => {
    writeFileSync(filePath, JSON.stringify(testPlan));

    const result = readTestPlan(filePath, 'success', '7.71.0');

    expect(result).toEqual({ testPlan: { ...testPlan, version: '7.71.0' } });
  });

  it('keeps the version from the test plan file', () => {
    writeFileSync(filePath, JSON.stringify({ ...testPlan, version: '7.70.0' }));

    const result = readTestPlan(filePath, 'success', '7.71.0');

    expect(result.testPlan?.version).toBe('7.70.0');
  });

  it.each([undefined, '', 'skipped'])(
    'returns no test plan and no error when the status is %p',
    (status) => {
      writeFileSync(filePath, JSON.stringify(testPlan));

      const result = readTestPlan(filePath, status, '7.71.0');

      expect(result).toEqual({ testPlan: null });
    },
  );

  it.each(['failure', 'cancelled'])(
    'returns a failure error when the status is %p',
    (status) => {
      const result = readTestPlan(filePath, status, '7.71.0');

      expect(result).toEqual({
        testPlan: null,
        error: 'Test plan generation failed - check logs for details',
      });
    },
  );

  it('returns an error when generation succeeded but the file is missing', () => {
    const result = readTestPlan(filePath, 'success', '7.71.0');

    expect(result).toEqual({
      testPlan: null,
      error: 'Test plan generation completed but no output file found',
    });
  });

  it('returns an error when the file is not valid JSON', () => {
    writeFileSync(filePath, 'not json');

    const result = readTestPlan(filePath, 'success', '7.71.0');

    expect(result.testPlan).toBeNull();
    expect(result.error).toMatch(/^Failed to read test plan: /u);
  });
});
