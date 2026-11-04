/**
 * Adds the AI test plan to an RC build comment that is already posted.
 *
 * The build comment goes up as soon as both builds succeed. Once the test plan job finishes,
 * the test plan (or its failure section) is appended the same way it was when the comment
 * waited for the test plan.
 */

import {
  buildTestPlanFailureSection,
  buildTestPlanSection,
} from './test-plan-section';
import type { TestPlanReadResult } from './utils';

const SECTION_SEPARATOR = '---\n\n';
const TEST_PLAN_HEADING = /^## AI Test Plan\r?$/mu;

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
 * Removes a test plan section added by an earlier attempt, and the separator above it.
 */
function removeTestPlanSection(body: string): string {
  const match = TEST_PLAN_HEADING.exec(body);
  if (!match) {
    return body;
  }

  return body.slice(0, match.index).replace(/---\s*$/u, '');
}

/**
 * Builds the comment body once the test plan job is done.
 * No test plan and no error means generation was skipped (no AI keys), so nothing is added.
 */
export function buildCommentWithTestPlan(
  body: string,
  { testPlan, error }: TestPlanReadResult,
  pipelineUrl?: string,
): string {
  if (testPlan) {
    return `${removeTestPlanSection(body)}${SECTION_SEPARATOR}${buildTestPlanSection(testPlan)}`;
  }

  if (error) {
    return `${removeTestPlanSection(body)}${buildTestPlanFailureSection(pipelineUrl, error)}`;
  }

  return body;
}
