/**
 * Finalize Test Plan Tool Handler
 *
 * Handles the finalization of the AI's test plan generation
 */

import { ToolInput } from '../../types';

export function handleFinalizeTestPlan(input: ToolInput): string {
  return JSON.stringify(input);
}
