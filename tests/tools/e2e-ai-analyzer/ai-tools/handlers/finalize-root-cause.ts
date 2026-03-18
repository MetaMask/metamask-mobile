/**
 * Finalize Root Cause Tool Handler
 *
 * Handles the finalization of the AI's root cause analysis.
 */

import { ToolInput } from '../../types';

export function handleFinalizeRootCause(input: ToolInput): string {
  return JSON.stringify(input);
}
