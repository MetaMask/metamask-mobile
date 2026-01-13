/**
 * Finalize Decision Tool Handler
 *
 * Handles the finalization of the AI's tag selection decision
 */

import { ToolInput } from '../../types';

export function handleFinalizeTagSelection(input: ToolInput): string {
  return JSON.stringify(input);
}
