/**
 * Related Files Tool Handler
 *
 * Finds files related to a changed file (importers, dependencies, tests, etc.)
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ToolInput } from '../../types';

export function handleRelatedFiles(input: ToolInput, baseDir: string): string {
  const filePath = input.file_path as string;
  const searchType = input.search_type as string;
  const maxResults = (input.max_results as number) || 20;

  const results: string[] = [];
  const isCI =
    filePath.includes('.github/workflows/') ||
    filePath.includes('.github/actions/') ||
    filePath.includes('/scripts/');

  try {
    // CI-specific relationships
    if ((searchType === 'ci' || searchType === 'all') && isCI) {
      // For reusable workflows: find who calls them
      if (filePath.includes('.github/workflows/')) {
        const workflowName = filePath.split('/').pop();
        const fullPath = join(baseDir, filePath);

        // Check if this is a reusable workflow
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf-8');
          const isReusable = content.includes('workflow_call');

          if (isReusable && workflowName) {
            // Find workflows that call this one
            const callers = execSync(
              `grep -r -l "uses:.*${workflowName}" .github/workflows/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
              { encoding: 'utf-8', cwd: baseDir }
            )
              .trim()
              .split('\n')
              .filter(f => f);

            if (callers.length > 0) {
              results.push(`🔄 Reusable Workflow - Called by ${callers.length} workflow(s):`);
              results.push(...callers.map(f => `  ${f}`));
            }
          }

          // Find what this workflow calls (other workflows)
          const workflowCalls =
            content.match(/uses:\s*\.\/\.github\/workflows\/([^\s]+)/g) || [];

          if (workflowCalls.length > 0) {
            results.push(
              results.length > 0
                ? '\n📤 Calls reusable workflows:'
                : '📤 Calls reusable workflows:'
            );
            const uniqueCalls = Array.from(new Set(workflowCalls));
            uniqueCalls.slice(0, maxResults).forEach(call => {
              const match = call.match(/uses:\s*\.\/\.github\/workflows\/([^\s]+)/);
              if (match) results.push(`  .github/workflows/${match[1]}`);
            });
          }

          // Find scripts used in this workflow
          const scriptCalls =
            content.match(
              /(?:\.\/)?(?:scripts|\.github\/scripts)\/[^\s'"]+\.(?:sh|mjs|js|ts)/g
            ) || [];
          const uniqueScripts = Array.from(new Set(scriptCalls));

          if (uniqueScripts.length > 0) {
            results.push(
              results.length > 0 ? '\n📜 Executes scripts:' : '📜 Executes scripts:'
            );
            uniqueScripts
              .slice(0, maxResults)
              .forEach(script => results.push(`  ${script.replace(/^\.\//, '')}`));
          }
        }
      }

      // For GitHub Actions: find workflows that use them
      if (filePath.includes('.github/actions/')) {
        const actionPathMatch = filePath.match(/\.github\/actions\/[^/]+/);
        if (actionPathMatch) {
          const actionPath = actionPathMatch[0];

          const workflowsUsingAction = execSync(
            `grep -r -l "uses:.*${actionPath}" .github/workflows/ 2>/dev/null | head -${maxResults} || true`,
            { encoding: 'utf-8', cwd: baseDir }
          )
            .trim()
            .split('\n')
            .filter(f => f);

          if (workflowsUsingAction.length > 0) {
            results.push(
              results.length > 0
                ? `\n🎬 GitHub Action used in ${workflowsUsingAction.length} workflow(s):`
                : `🎬 GitHub Action used in ${workflowsUsingAction.length} workflow(s):`
            );
            results.push(...workflowsUsingAction.map(f => `  ${f}`));
          }
        }
      }

      // For scripts: find workflows that use them
      if (
        filePath.includes('/scripts/') ||
        filePath.endsWith('.sh') ||
        filePath.endsWith('.mjs') ||
        filePath.endsWith('.js')
      ) {
        const scriptName = filePath.split('/').pop() || filePath;
        const scriptPath = filePath.replace(/^\.\//, '');

        const workflowsUsingScript = execSync(
          `grep -r -l -E "${scriptPath}|${scriptName}" .github/workflows/ 2>/dev/null | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir }
        )
          .trim()
          .split('\n')
          .filter(f => f);

        if (workflowsUsingScript.length > 0) {
          results.push(
            results.length > 0
              ? '\n⚙️  Script used in workflows:'
              : '⚙️  Script used in workflows:'
          );
          results.push(...workflowsUsingScript.map(f => `  ${f}`));
        }

        // Check if script is used in other scripts
        const scriptsDir = filePath.includes('.github/scripts')
          ? '.github/scripts'
          : 'scripts';
        const otherScriptsUsing = execSync(
          `grep -r -l "${scriptName}" ${scriptsDir}/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir }
        )
          .trim()
          .split('\n')
          .filter(f => f);

        if (otherScriptsUsing.length > 0) {
          results.push(
            results.length > 0
              ? '\n🔗 Referenced in other scripts:'
              : '🔗 Referenced in other scripts:'
          );
          results.push(...otherScriptsUsing.map(f => `  ${f}`));
        }
      }
    }

    // Find files that import this file (dependents)
    if ((searchType === 'importers' || searchType === 'all') && !isCI) {
      const importPattern = filePath
        .replace(/^app\//, '')
        .replace(/\.(ts|tsx|js|jsx)$/, '');
      const fileName = importPattern.split('/').pop();

      if (fileName) {
        const importers = execSync(
          `grep -r -l --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "from.*['\\\"].*${fileName}" app/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir }
        )
          .trim()
          .split('\n')
          .filter(f => f);

        if (importers.length > 0) {
          results.push(
            results.length > 0
              ? `\n📥 Importers (${importers.length} files depend on this):`
              : `📥 Importers (${importers.length} files depend on this):`
          );
          results.push(...importers.map(f => `  ${f}`));
        }
      }
    }

    // Find what this file imports (dependencies)
    if ((searchType === 'imports' || searchType === 'all') && !isCI) {
      const fullPath = join(baseDir, filePath);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
        const relativeImports = imports
          .map(imp => imp.match(/from\s+['"]([^'"]+)['"]/)?.[1])
          .filter(imp => imp && (imp.startsWith('./') || imp.startsWith('../')))
          .slice(0, maxResults);

        if (relativeImports.length > 0) {
          results.push(
            results.length > 0
              ? `\n📦 Imports (${relativeImports.length} local dependencies):`
              : `📦 Imports (${relativeImports.length} local dependencies):`
          );
          results.push(...relativeImports.map(imp => `  ${imp}`));
        }
      }
    }

    // Find related test files
    if ((searchType === 'tests' || searchType === 'all') && !isCI) {
      const baseName = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
      const fileName = baseName.split('/').pop();

      if (fileName) {
        const testFiles = execSync(
          `find . -type f \\( -name "*${fileName}*.test.*" -o -name "*${fileName}*.spec.*" -o -path "*/__tests__/*${fileName}*" \\) 2>/dev/null | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir }
        )
          .trim()
          .split('\n')
          .filter(f => f);

        if (testFiles.length > 0) {
          results.push(
            results.length > 0
              ? `\n🧪 Test files (${testFiles.length}):`
              : `🧪 Test files (${testFiles.length}):`
          );
          results.push(...testFiles.map(f => `  ${f.replace(/^\.\//, '')}`));
        }
      }
    }

    // Find files in same module/directory
    if (searchType === 'module' || searchType === 'all') {
      const directory = filePath.substring(0, filePath.lastIndexOf('/'));
      const fileName = filePath.split('/').pop();

      if (directory) {
        const moduleFiles = execSync(
          `find "${directory}" -maxdepth 1 -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.yml" -o -name "*.yaml" \\) 2>/dev/null | grep -v "${fileName}" | head -${maxResults} || true`,
          { encoding: 'utf-8', cwd: baseDir }
        )
          .trim()
          .split('\n')
          .filter(f => f);

        if (moduleFiles.length > 0) {
          results.push(
            results.length > 0
              ? `\n📁 Same module (${directory}):`
              : `📁 Same module (${directory}):`
          );
          results.push(...moduleFiles.map(f => `  ${f}`));
        }
      }
    }

    return results.length > 0
      ? `Related files for ${filePath}:\n\n${results.join('\n')}`
      : `No related files found for ${filePath}`;
  } catch (error) {
    return `Error finding related files: ${error instanceof Error ? error.message : String(error)}`;
  }
}
