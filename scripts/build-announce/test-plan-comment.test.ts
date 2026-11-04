import {
  TEST_PLAN_PENDING_MARKER,
  applyTestPlanSection,
  buildCommentWithTestPlan,
  buildTestPlanPendingSection,
  isNewestRcComment,
  removePendingTestPlanSection,
} from './test-plan-comment';
import type { TestPlanResult } from './types';

const PIPELINE_URL = 'https://github.com/MetaMask/metamask-mobile/actions/runs/1';

const pendingComment = `Build links

---

${buildTestPlanPendingSection(PIPELINE_URL)}`;

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

describe('buildTestPlanPendingSection', () => {
  it('includes the pending marker, the heading and the workflow run link', () => {
    const section = buildTestPlanPendingSection(PIPELINE_URL);

    expect(section).toContain(TEST_PLAN_PENDING_MARKER);
    expect(section).toContain('## AI Test Plan');
    expect(section).toContain(`[Workflow run](${PIPELINE_URL})`);
  });

  it('omits the workflow run link when there is no pipeline URL', () => {
    expect(buildTestPlanPendingSection()).not.toContain('Workflow run');
  });
});

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

describe('applyTestPlanSection', () => {
  it('replaces the pending block and keeps the build links', () => {
    const updated = applyTestPlanSection(
      pendingComment,
      '## AI Test Plan\n\nReady\n',
    );

    expect(updated).toBe('Build links\n\n---\n\n## AI Test Plan\n\nReady\n');
  });

  it('replaces a test plan from an earlier attempt', () => {
    const first = applyTestPlanSection(
      pendingComment,
      '## AI Test Plan\n\nFirst\n',
    );

    const second = applyTestPlanSection(first, '## AI Test Plan\n\nSecond\n');

    expect(second).toBe('Build links\n\n---\n\n## AI Test Plan\n\nSecond\n');
  });

  it('appends the section when the comment has no test plan block', () => {
    expect(applyTestPlanSection('Build links\n', '## AI Test Plan\n')).toBe(
      'Build links\n\n## AI Test Plan\n',
    );
  });
});

describe('removePendingTestPlanSection', () => {
  it('removes the pending block and its separator', () => {
    expect(removePendingTestPlanSection(pendingComment)).toBe('Build links\n');
  });

  it('leaves a comment without a pending block unchanged', () => {
    expect(removePendingTestPlanSection('Build links\n')).toBe('Build links\n');
  });
});

describe('buildCommentWithTestPlan', () => {
  it('replaces the pending block with the test plan', () => {
    const body = buildCommentWithTestPlan(pendingComment, testPlan, undefined);

    expect(body).toContain('Build links');
    expect(body).toContain('## AI Test Plan');
    expect(body).toContain('test-model');
    expect(body).not.toContain(TEST_PLAN_PENDING_MARKER);
  });

  it('replaces the pending block with a failure section', () => {
    const body = buildCommentWithTestPlan(
      pendingComment,
      null,
      'Test plan generation failed - check logs for details',
      PIPELINE_URL,
    );

    expect(body).toContain('Test plan generation failed');
    expect(body).not.toContain(TEST_PLAN_PENDING_MARKER);
  });

  it('removes the pending block when generation was skipped', () => {
    expect(buildCommentWithTestPlan(pendingComment, null, undefined)).toBe(
      'Build links\n',
    );
  });
});
