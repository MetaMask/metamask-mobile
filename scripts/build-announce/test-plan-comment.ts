/**
 * Splices an AI test plan into an existing RC build comment.
 *
 * The build comment is posted first, with a pending marker. The test plan
 * workflow replaces that marker once generation finishes.
 */

export const TEST_PLAN_PENDING_MARKER =
  '<!-- metamask-bot-rc-test-plan-pending -->';

const TEST_PLAN_HEADING = '## AI Test Plan';

export interface RcCommentRef {
  id: number;
  body: string;
}

export type RcCommentSelection =
  | { status: 'ready'; comment: RcCommentRef }
  | { status: 'missing' }
  | { status: 'superseded' };

/**
 * Placeholder appended to the RC comment until the test plan workflow edits it.
 */
export function buildTestPlanPendingSection(): string {
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const repository = process.env.GITHUB_REPOSITORY || 'MetaMask/metamask-mobile';
  const runsUrl = `${server}/${repository}/actions/workflows/rc-ai-test-plan.yml`;

  return `${TEST_PLAN_PENDING_MARKER}
## AI Test Plan

The AI test plan is generating and will be added to this comment. [Workflow runs](${runsUrl}).
`;
}

/**
 * Picks the RC comment for this build.
 * A newer RC comment means this build was superseded and must not be edited.
 */
export function selectRcCommentForTestPlan(
  comments: RcCommentRef[],
  iosBuildNumber: string,
  androidBuildNumber: string,
): RcCommentSelection {
  const iosMarker = `**iOS Build Number**: \`${iosBuildNumber}\``;
  const androidMarker = `**Android Build Number**: \`${androidBuildNumber}\``;

  const matches = comments.filter(
    (comment) =>
      comment.body.includes(iosMarker) &&
      comment.body.includes(androidMarker),
  );

  if (matches.length === 0) {
    return { status: 'missing' };
  }

  const comment = matches.reduce((latest, candidate) =>
    candidate.id > latest.id ? candidate : latest,
  );

  const newestId = comments.reduce(
    (highest, candidate) => Math.max(highest, candidate.id),
    0,
  );

  if (comment.id !== newestId) {
    return { status: 'superseded' };
  }

  return { status: 'ready', comment };
}

/**
 * Replaces the pending block, or an existing test plan, with `section`.
 * The plan is always the last part of the comment.
 */
export function applyTestPlanSection(body: string, section: string): string {
  const pendingIndex = body.indexOf(TEST_PLAN_PENDING_MARKER);
  const headingIndex = body.indexOf(TEST_PLAN_HEADING);
  // The pending marker is the start of the placeholder, and it sits above the
  // heading. Prefer it so a re-run that already dropped the marker falls
  // through to the heading.
  let cutIndex = -1;
  if (pendingIndex !== -1) {
    cutIndex = pendingIndex;
  } else if (headingIndex !== -1) {
    cutIndex = headingIndex;
  }

  const trimmedSection = `${section.trim()}\n`;

  if (cutIndex === -1) {
    return `${body.replace(/\s*$/, '\n\n')}${trimmedSection}`;
  }

  return `${body.slice(0, cutIndex).replace(/\s*$/, '\n\n')}${trimmedSection}`;
}

/**
 * Drops the pending block when no test plan will be generated.
 * Also drops the separator that existed only for that block.
 */
export function removePendingTestPlanSection(body: string): string {
  const pendingIndex = body.indexOf(TEST_PLAN_PENDING_MARKER);
  if (pendingIndex === -1) {
    return body;
  }

  return body
    .slice(0, pendingIndex)
    .replace(/\n---\s*$/, '\n')
    .replace(/\s*$/, '\n');
}
