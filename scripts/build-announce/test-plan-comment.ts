/**
 * Adds the AI test plan to an RC build comment that is already posted.
 *
 * The build comment goes up with a pending block as soon as both builds succeed.
 * Once the test plan job finishes, that block is replaced with the plan, a failure
 * section, or removed when generation was skipped.
 */

import {
  buildTestPlanCancelledSection,
  buildTestPlanFailureSection,
  buildTestPlanSection,
} from './test-plan-section';
import type { TestPlanReadResult } from './utils';

export const TEST_PLAN_PENDING_MARKER =
  '<!-- metamask-bot-rc-test-plan-pending -->';

const TEST_PLAN_HEADING = '## AI Test Plan';

/**
 * Placeholder posted with the build links until the test plan is ready.
 */
export function buildTestPlanPendingSection(pipelineUrl?: string): string {
  const runLink = pipelineUrl ? ` [Workflow run](${pipelineUrl}).` : '';

  return `${TEST_PLAN_PENDING_MARKER}
${TEST_PLAN_HEADING}

:hourglass_flowing_sand: The AI test plan is generating and will be added to this comment.${runLink}
`;
}

/**
 * A newer RC comment means a newer build was posted, so this one must not be edited.
 */
export function isNewestRcComment(
  comments: { id: number }[],
  commentId: number,
): boolean {
  const newestId = Math.max(...comments.map((comment) => comment.id));
  return comments.length > 0 && newestId === commentId;
}

/**
 * Replaces the pending block, or a test plan from an earlier attempt, with `section`.
 * The test plan is always the last part of the comment.
 */
export function applyTestPlanSection(body: string, section: string): string {
  const pendingIndex = body.indexOf(TEST_PLAN_PENDING_MARKER);
  const cutIndex =
    pendingIndex === -1 ? body.lastIndexOf(TEST_PLAN_HEADING) : pendingIndex;
  const head = cutIndex === -1 ? body : body.slice(0, cutIndex);

  return `${head.replace(/\s*$/u, '\n\n')}${section.trim()}\n`;
}

/**
 * Drops the pending block, and the separator above it, when no test plan will be added.
 */
export function removePendingTestPlanSection(body: string): string {
  const pendingIndex = body.indexOf(TEST_PLAN_PENDING_MARKER);
  if (pendingIndex === -1) {
    return body;
  }

  return body
    .slice(0, pendingIndex)
    .replace(/\n---\s*$/u, '\n')
    .replace(/\s*$/u, '\n');
}

/**
 * Builds the comment body once the test plan job is done.
 * No test plan, no error and not cancelled means generation was skipped (no AI keys).
 */
export function buildCommentWithTestPlan(
  body: string,
  { testPlan, error, cancelled }: TestPlanReadResult,
  pipelineUrl?: string,
): string {
  if (testPlan) {
    return applyTestPlanSection(body, buildTestPlanSection(testPlan));
  }

  if (cancelled) {
    return applyTestPlanSection(body, buildTestPlanCancelledSection(pipelineUrl));
  }

  if (error) {
    return applyTestPlanSection(
      body,
      buildTestPlanFailureSection(pipelineUrl, error),
    );
  }

  return removePendingTestPlanSection(body);
}
