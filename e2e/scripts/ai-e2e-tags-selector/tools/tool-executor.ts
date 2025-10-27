/**
 * Tool Executor
 *
 * Dispatches tool calls to appropriate handlers
 */

import { ToolInput } from '../types';
import { handleReadFile } from './handlers/read-file';
import { handleGitDiff } from './handlers/git-diff';
import { handlePRDiff } from './handlers/pr-diff';
import { handleRelatedFiles } from './handlers/related-files';
import { handleFinalizeDecision } from './handlers/finalize-decision';

/**
 * Executes a tool call and returns the result
 */
export async function executeTool(
  toolName: string,
  input: ToolInput,
  context: {
    baseDir: string;
    baseBranch: string;
    includeMainChanges: boolean;
  }
): Promise<string> {
  try {
    switch (toolName) {
      case 'read_file':
        return handleReadFile(input, context.baseDir);

      case 'get_git_diff':
        return handleGitDiff(
          input,
          context.baseDir,
          context.baseBranch,
          context.includeMainChanges
        );

      case 'get_pr_diff':
        return handlePRDiff(input);

      case 'find_related_files':
        return handleRelatedFiles(input, context.baseDir);

      case 'finalize_decision':
        return handleFinalizeDecision(input);

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    return `Tool error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
