/**
 * Agent Prompt Builder
 *
 * Builds the initial prompt for the AI agent based on changed files
 */

import { FileCategorization } from '../types';
import { APP_CONFIG } from '../config';

/**
 * Explains why a file is marked as critical
 */
function explainCritical(file: string): string {
  const reasons: string[] = [];
  const { files, keywords, paths } = APP_CONFIG.critical;

  if (files.includes(file)) {
    reasons.push('exact match');
  }

  keywords.forEach(keyword => {
    if (file.includes(keyword)) {
      reasons.push(`contains '${keyword}'`);
    }
  });

  paths.forEach(path => {
    if (file.includes(path)) {
      reasons.push(`in '${path}'`);
    }
  });

  return reasons.length > 0 ? ` [${reasons.join(', ')}]` : '';
}

/**
 * Builds the agent prompt from file categorization
 */
export function buildAgentPrompt(
  categorization: FileCategorization
): string {
  const { allFiles, criticalFiles } = categorization;
  const otherFiles = allFiles.filter(f => !criticalFiles.includes(f));

  const fileList: string[] = [];

  // Critical files first with explanation
  if (criticalFiles.length > 0) {
    fileList.push('⚠️  CRITICAL FILES (examine carefully):');
    criticalFiles.forEach(f => fileList.push(`  ${f}${explainCritical(f)}`));
    fileList.push('');
  }

  // Other files
  if (otherFiles.length > 0) {
    fileList.push(`OTHER FILES (${otherFiles.length}):`);
    // Show first 20, truncate if more
    otherFiles.slice(0, 20).forEach(f => fileList.push(`  ${f}`));
    if (otherFiles.length > 20) {
      fileList.push(`  ... and ${otherFiles.length - 20} more`);
    }
  }

  return `Analyze these code changes and select E2E smoke test tags.

CHANGED FILES (${allFiles.length} total):
${fileList.join('\n')}

${
    criticalFiles.length > 0
      ? `⚠️  ${criticalFiles.length} CRITICAL FILES DETECTED - Examine these carefully using get_git_diff or read_file.\n`
      : ''
  }
Investigate thoroughly. Use tools as needed.
Think deeply about impacts.

IMPORTANT: Use your judgment on whether tests are needed.
- If changes are genuinely non-functional, then 0 tags is fine.
- If functional code changes → select relevant tags
- Critical files should almost always trigger tests

Call finalize_decision when ready.`;
}
