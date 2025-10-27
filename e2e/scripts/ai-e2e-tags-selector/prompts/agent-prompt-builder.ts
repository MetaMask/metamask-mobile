/**
 * Agent Prompt Builder
 *
 * Builds the initial prompt for the AI agent based on changed files
 */

import { FileCategorization } from '../types';

/**
 * Builds the agent prompt from file categorization
 */
export function buildAgentPrompt(
  categorization: FileCategorization,
  prNumber?: number
): string {
  const { allFiles, criticalFiles, categories, summary, hasCriticalChanges } =
    categorization;

  const fileList: string[] = [];

  // Critical files first
  if (criticalFiles.length > 0) {
    fileList.push('⚠️  CRITICAL FILES (must examine):');
    criticalFiles.forEach(f => fileList.push(`  CRITICAL ${f}`));
    fileList.push('');
  }

  // Core/Controllers
  if (
    categories.core.length > 0 &&
    !criticalFiles.some(f => categories.core.includes(f))
  ) {
    fileList.push('Core/Controllers:');
    categories.core.slice(0, 10).forEach(f => fileList.push(`  ${f}`));
    if (categories.core.length > 10)
      fileList.push(`  ... and ${categories.core.length - 10} more`);
    fileList.push('');
  }

  // App code
  if (categories.app.length > 0) {
    fileList.push('App Code:');
    categories.app.slice(0, 15).forEach(f => fileList.push(`  ${f}`));
    if (categories.app.length > 15)
      fileList.push(`  ... and ${categories.app.length - 15} more`);
    fileList.push('');
  }

  // CI/CD
  if (categories.ci.length > 0) {
    fileList.push('CI/CD:');
    categories.ci.forEach(f => fileList.push(`  ${f}`));
    fileList.push('');
  }

  // Other categories
  const others = [
    ['Dependencies', categories.dependencies],
    ['Config', categories.config],
    ['Tests', categories.tests],
    ['Docs', categories.docs],
    ['Assets', categories.assets],
    ['Other', categories.other]
  ] as const;

  others.forEach(([name, files]) => {
    if (files.length > 0) {
      fileList.push(`${name}:`);
      files.slice(0, 5).forEach(f => fileList.push(`  ${f}`));
      if (files.length > 5) fileList.push(`  ... and ${files.length - 5} more`);
      fileList.push('');
    }
  });

  return `Analyze these code changes and select E2E smoke test tags.

${prNumber ? `PR #${prNumber}\n` : ''}CHANGED FILES (${allFiles.length} total):
${fileList.join('\n')}

SUMMARY:
- App code: ${summary.app} files
- Core/Controllers: ${summary.core} files ${hasCriticalChanges ? '⚠️ CRITICAL' : ''}
- Dependencies: ${summary.dependencies} files
- Config: ${summary.config} files
- CI/CD: ${summary.ci} files
- Tests: ${summary.tests} files
- Docs: ${summary.docs} files
- Assets: ${summary.assets} files
- Other: ${summary.other} files

${prNumber ? `Use get_pr_diff(${prNumber}) to see actual changes.\n` : ''}${
    criticalFiles.length > 0
      ? `⚠️  CRITICAL FILES DETECTED - Examine these carefully using read_file or get_git_diff.\n`
      : ''
  }Investigate thoroughly. Use tools as needed.
Think deeply about impacts.

IMPORTANT: Use your judgment on whether tests are needed.
- If changes are genuinely non-functional, then 0 tags is fine.
- If functional code changes → select relevant tags
- Critical files (marked CRITICAL) should almost always trigger tests

Call finalize_decision when ready.`;
}
