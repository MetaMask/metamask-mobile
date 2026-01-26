/**
 * Tool Executor
 *
 * Dispatches tool calls to appropriate handlers
 */

import { ToolInput } from '../types';
import { handleReadFile } from './handlers/read-file.ts';
import { handleGitDiff } from './handlers/git-diff.ts';
import { handleRelatedFiles } from './handlers/related-files.ts';
import { handleListDirectory } from './handlers/list-directory.ts';
import { handleGrepCodebase } from './handlers/grep-codebase.ts';
import { handleFinalizeTagSelection } from './handlers/finalize-tag-selection.ts';

/**
 * Tool execution context
 */
export interface ToolContext {
  baseDir: string;
  baseBranch: string;
  prNumber?: number;
  githubRepo?: string;
}

/**
 * Executes a tool call and returns the result
 */
export async function executeTool(
  toolName: string,
  input: ToolInput,
  context: ToolContext,
): Promise<string> {
  try {
    switch (toolName) {
      case 'read_file':
        return handleReadFile(input, context.baseDir);

      case 'get_git_diff':
        return handleGitDiff(input, context);

      case 'find_related_files':
        return handleRelatedFiles(input, context.baseDir);

      case 'list_directory':
        return handleListDirectory(input, context.baseDir);

      case 'grep_codebase':
        return handleGrepCodebase(input, context.baseDir);

      case 'finalize_tag_selection':
        return handleFinalizeTagSelection(input);

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    return `Tool error: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
