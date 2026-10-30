import {
  TEST_PLAN_PENDING_MARKER,
  applyTestPlanSection,
  buildTestPlanPendingSection,
  removePendingTestPlanSection,
  selectRcCommentForTestPlan,
} from './test-plan-comment';

const IOS = '**iOS Build Number**: `501`';
const ANDROID = '**Android Build Number**: `502`';

function rcComment(id: number, extra = ''): { id: number; body: string } {
  return {
    id,
    body: `<!-- metamask-bot-rc-build-announce -->
### RC Builds Ready for Testing

${IOS}
${ANDROID}
${extra}`,
  };
}

describe('buildTestPlanPendingSection', () => {
  it('includes the marker the follow-up workflow replaces', () => {
    expect(buildTestPlanPendingSection()).toContain(TEST_PLAN_PENDING_MARKER);
    expect(buildTestPlanPendingSection()).toContain('## AI Test Plan');
    expect(buildTestPlanPendingSection()).toContain(
      'actions/workflows/rc-ai-test-plan.yml',
    );
  });
});

describe('selectRcCommentForTestPlan', () => {
  it('returns the comment whose build numbers match', () => {
    const older = rcComment(10);
    const current = rcComment(11);

    expect(
      selectRcCommentForTestPlan([older, current], '501', '502'),
    ).toEqual({ status: 'ready', comment: current });
  });

  it('does not edit a comment after a newer RC comment exists', () => {
    const current = rcComment(11);
    const newer = {
      id: 12,
      body: `<!-- metamask-bot-rc-build-announce -->
**iOS Build Number**: \`503\`
**Android Build Number**: \`504\``,
    };

    expect(selectRcCommentForTestPlan([current, newer], '501', '502')).toEqual(
      { status: 'superseded' },
    );
  });

  it('reports missing when neither build number matches', () => {
    expect(selectRcCommentForTestPlan([rcComment(10)], '1', '2')).toEqual({
      status: 'missing',
    });
  });

  it('requires both platforms so a shared build number cannot cross-match', () => {
    const comment = rcComment(10);

    expect(selectRcCommentForTestPlan([comment], '501', '999')).toEqual({
      status: 'missing',
    });
  });
});

describe('applyTestPlanSection', () => {
  const comment = `Build links

---

${buildTestPlanPendingSection()}`;

  it('replaces the pending block and keeps the build links', () => {
    const updated = applyTestPlanSection(comment, '## AI Test Plan\n\nReady\n');

    expect(updated).toContain('Build links');
    expect(updated).toContain('## AI Test Plan');
    expect(updated).toContain('Ready');
    expect(updated).not.toContain(TEST_PLAN_PENDING_MARKER);
    expect(updated).not.toContain('will be added to this comment');
  });

  it('replaces an existing test plan on a re-run', () => {
    const withPlan = applyTestPlanSection(
      comment,
      '## AI Test Plan\n\nFirst\n',
    );
    const rerun = applyTestPlanSection(withPlan, '## AI Test Plan\n\nSecond\n');

    expect(rerun).toContain('Second');
    expect(rerun).not.toContain('First');
    expect(rerun).toContain('Build links');
  });
});

describe('removePendingTestPlanSection', () => {
  it('removes the pending block and its separator', () => {
    const comment = `Build links

---

${buildTestPlanPendingSection()}`;

    expect(removePendingTestPlanSection(comment)).toBe('Build links\n');
  });

  it('leaves a comment unchanged when there is no pending block', () => {
    expect(removePendingTestPlanSection('Build links\n')).toBe('Build links\n');
  });
});
