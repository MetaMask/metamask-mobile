/**
 * Finalize Decision Tool Handler
 *
 * Handles the finalization of the AI's tag selection decision
 */

import { ToolInput } from '../../types';

export function handleFinalizeDecision(input: ToolInput): string {
  return JSON.stringify(input);
}
