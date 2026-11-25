import {
  buildCommentWithTestPlan,
  isNewestRcComment,
} from './test-plan-comment';
import {
  buildTestPlanFailureSection,
  buildTestPlanSection,
} from './test-plan-section';
import type { TestPlanResult } from './types';

const PIPELINE_URL = 'https://github.com/MetaMask/metamask-mobile/actions/runs/1';
const FAILURE = 'Test plan generation failed - check logs for details';

const buildComment = `<!-- metamask-bot-rc-build-announce -->
### :rocket: RC Builds Ready for Testing

Build links

---

## What's in this RC

Cherry-picks
`;

const testPlan: TestPlanResult = {
  prNumber: 123,
  prTitle: 'Release 8.19.0',
  generatedAt: '2026-11-04T00:00:00.000Z',
  model: 'test-model',
  version: '8.19.0',
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

describe('isNewestRcComment', () => {
  it('returns true when the comment is the newest RC comment', () => {
    expect(isNewestRcComment([{ id: 10 }, { id: 11 }], 11)).toBe(true);
  });

  it('returns false when a newer RC comment exists', () => {
    expect(isNewestRcComment([{ id: 11 }, { id: 12 }], 11)).toBe(false);
  });

  it('returns false when there are no RC comments', () => {
    expect(isNewestRcComment([], 11)).toBe(false);
  });
});

describe('buildCommentWithTestPlan', () => {
  it('appends the test plan the same way the single-step comment did', () => {
    const body = buildCommentWithTestPlan(buildComment, { testPlan });

    expect(body).toBe(`${buildComment}---\n\n${buildTestPlanSection(testPlan)}`);
  });

  it('appends the failure section the same way the single-step comment did', () => {
    const body = buildCommentWithTestPlan(
      buildComment,
      { testPlan: null, error: FAILURE },
      PIPELINE_URL,
    );

    expect(body).toBe(
      `${buildComment}${buildTestPlanFailureSection(PIPELINE_URL, FAILURE)}`,
    );
  });

  it('leaves the comment unchanged when generation was skipped', () => {
    expect(buildCommentWithTestPlan(buildComment, { testPlan: null })).toBe(
      buildComment,
    );
  });

  it('does not add a second test plan when the job is re-run', () => {
    const once = buildCommentWithTestPlan(buildComment, { testPlan });

    expect(buildCommentWithTestPlan(once, { testPlan })).toBe(once);
  });

  it('replaces a failure section with the test plan on a successful re-run', () => {
    const failed = buildCommentWithTestPlan(
      buildComment,
      { testPlan: null, error: FAILURE },
      PIPELINE_URL,
    );

    expect(buildCommentWithTestPlan(failed, { testPlan })).toBe(
      `${buildComment}---\n\n${buildTestPlanSection(testPlan)}`,
    );
  });
});
