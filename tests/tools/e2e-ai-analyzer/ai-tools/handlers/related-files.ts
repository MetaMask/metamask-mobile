/**
 * Related Files Tool Handler
 *
 * Finds files related to a changed file:
 * - CI files: Workflow callers, script usage
 * - Code files: Importers (who depends on this)
 */

import { execSync } from 'node:child_process';
import { ToolInput } from '../../types';
import { TOOL_LIMITS } from '../../config.ts';

/**
 * Escapes shell special characters to prevent command injection
 */
function escapeShell(str: string): string {
  return str.replace(/[`$\\"\n]/g, '\\$&');
}

/**
 * Escapes grep regex metacharacters to treat as literal
 */
function escapeGrepRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function handleRelatedFiles(input: ToolInput, baseDir: string): string {
  const filePath = escapeShell(input.file_path as string);
  const searchType = input.search_type as string;
  const maxResults =
    (input.max_results as number) || TOOL_LIMITS.relatedFilesMaxResults;

  const isCI = filePath.includes('.github/') || filePath.includes('/scripts/');

  // Handle CI files (workflows, actions, scripts)
  if (isCI) {
    return findCIRelationships(filePath, baseDir, maxResults);
  }

  // Handle code files - find importers (who depends on this)
  if (searchType === 'importers' || searchType === 'all') {
    return findImporters(filePath, baseDir, maxResults);
  }

  return `Use grep_codebase to search for patterns or list_directory to see module files.`;
}

/**
 * Finds CI relationships (workflow callers, script usage)
 */
function findCIRelationships(
  filePath: string,
  baseDir: string,
  maxResults: number,
): string {
  const results: string[] = [];

  try {
    // Workflows: Find callers
    if (filePath.includes('.github/workflows/')) {
      const workflowName = escapeShell(filePath.split('/').pop() || '');
      const callers = execSync(
        `grep -r -l "uses:.*${workflowName}" .github/workflows/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
        { encoding: 'utf-8', cwd: baseDir },
      )
        .trim()
        .split('\n')
        .filter(Boolean);

      if (callers.length > 0) {
        results.push(`🔄 Called by ${callers.length} workflow(s):`);
        results.push(...callers.map((f) => `  ${f}`));
      }
    }

    // Actions: Find workflows using them
    if (filePath.includes('.github/actions/')) {
      const actionPath = escapeShell(
        filePath.match(/\.github\/actions\/[^/]+/)?.[0] || '',
      );
      if (actionPath) {
        const workflows = execSync(
          `grep -r -l "uses:.*${actionPath}" .github/workflows/ 2>/dev/null | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir },
        )
          .trim()
          .split('\n')
          .filter(Boolean);

        if (workflows.length > 0) {
          results.push(`🎬 Used in ${workflows.length} workflow(s):`);
          results.push(...workflows.map((f) => `  ${f}`));
        }
      }
    }

    // Scripts: Find workflows using them
    if (filePath.includes('/scripts/')) {
      const scriptName = escapeShell(filePath.split('/').pop() || filePath);
      const workflows = execSync(
        `grep -r -l "${scriptName}" .github/workflows/ 2>/dev/null | head -${maxResults} || true`,
        { encoding: 'utf-8', cwd: baseDir },
      )
        .trim()
        .split('\n')
        .filter(Boolean);

      if (workflows.length > 0) {
        results.push(`⚙️  Used in ${workflows.length} workflow(s):`);
        results.push(...workflows.map((f) => `  ${f}`));
      }
    }

    return results.length > 0
      ? `Related files for ${filePath}:\n\n${results.join('\n')}`
      : `No CI relationships found for ${filePath}`;
  } catch (error) {
    return `Error finding CI relationships: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

/**
 * Finds files that import this file (dependents)
 */
function findImporters(
  filePath: string,
  baseDir: string,
  maxResults: number,
): string {
  try {
    const rawFileName =
      filePath
        .replace(/^app\//, '')
        .replace(/\.(ts|tsx|js|jsx)$/, '')
        .split('/')
        .pop() || '';

    if (!rawFileName) {
      return `Cannot extract filename from ${filePath}`;
    }

    // Escape fileName for grep regex (. * + ? etc. become literals)
    const fileNameEscaped = escapeGrepRegex(rawFileName);

    // Then escape for shell
    const fileNameSafe = escapeShell(fileNameEscaped);

    // Find files that import this file
    // Pattern matches: from './fileName' or from "../fileName" (with space after from)
    // Build pattern with properly escaped quotes for shell
    // eslint-disable-next-line no-useless-escape
    const pattern = `from ['\\\"].*${fileNameSafe}`; // from ['\"].*fileName

    const importers = execSync(
      `grep -r -l --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "${pattern}" app/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
      { encoding: 'utf-8', cwd: baseDir },
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    if (importers.length > 0) {
      return `📥 ${importers.length} file(s) import this:\n\n${importers
        .map((f) => `  ${f}`)
        .join('\n')}`;
    }

    return `No importers found for ${filePath}`;
  } catch (error) {
    return `Error finding importers: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
