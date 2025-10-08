/**
 * AI E2E Tag Selector
 *
 * Uses Claude with extended thinking and tool use to analyze code changes
 * and select appropriate E2E smoke test tags.
 * Requires E2E_CLAUDE_API_KEY environment variable and GitHub CLI (gh) installed.
 * Designed for CI integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { tags } from '../../e2e/tags';

const smokeTags = Object.values(tags).filter((tag): tag is string => typeof tag === 'string' && tag.includes('Smoke'));

interface AIAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  selectedTags: string[];
  areas: string[];
  reasoning: string;
  confidence: number;
  testFileInfo?: TagTestInfo[];
  totalSplits?: number;
}

interface TagTestInfo {
  tag: string;
  testFiles: string[];
  fileCount: number;
  recommendedSplits: number;
}

interface ParsedArgs {
  baseBranch: string;
  dryRun: boolean;
  verbose: boolean;
  output: 'default' | 'json' | 'tags';
  includeMainChanges: boolean;
  changedFiles?: string;
  prNumber?: number;
}



export class AIE2ETagsSelector {
  private anthropic: Anthropic;

  private readonly pipelineTags = [
    'SmokeAccounts',
    'SmokeConfirmations',
    'SmokeConfirmationsRedesigned',
    'SmokeIdentity',
    'SmokeNetworkAbstractions',
    'SmokeNetworkExpansion',
    'SmokeTrade',
    'SmokeWalletPlatform'
  ];

  private readonly availableTags = smokeTags
    .map((tag: string) => tag.replace(':', '').trim())
    .filter((tag: string) => tag.length > 0);

  private isQuietMode = false;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private readonly baseDir = process.cwd();

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });

    if (this.availableTags.length === 0) {
      throw new Error('No available Smoke tags found in e2e/tags.js');
    }
  }

  private log(message: string): void {
    if (!this.isQuietMode) {
      console.log(message);
    }
  }



  async analyzeWithAgent(
    categorization: ReturnType<typeof this.categorizeFiles>,
    prNumber?: number
  ): Promise<AIAnalysis> {
    this.log('🤖 Starting AI analysis for E2E tests...');

    const tools = this.defineTools();
    this.conversationHistory = [];

    const initialPrompt = this.buildAgentPrompt(categorization, prNumber);

    let currentMessage: string | Anthropic.MessageParam['content'] = initialPrompt;
    const maxIterations = 12;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      this.log(`🔄 Iteration ${iteration + 1}/${maxIterations}...`);

      const response: Anthropic.Message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000
        },
        system: this.buildSystemPrompt(),
        tools,
        messages: [
          ...this.conversationHistory,
          { role: 'user', content: currentMessage }
        ]
      });


      const thinking = response.content.find((block: Anthropic.ContentBlock) => block.type === 'thinking');
      if (thinking && 'thinking' in thinking && this.isQuietMode === false) {
        this.log(`💭 ${thinking.thinking.substring(0, 200)}...`);
      }

      const toolUseBlocks = response.content.filter((block: Anthropic.ContentBlock) => block.type === 'tool_use');

      if (toolUseBlocks.length > 0) {
        const toolResults: Anthropic.MessageParam['content'] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type === 'tool_use') {
            this.log(`🔧 Tool: ${toolUse.name}`);

            const toolResult = await this.executeTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>
            );


            if (toolUse.name === 'finalize_decision') {
              const analysis = this.parseAgentDecision(toolResult);
              if (analysis) {

                if (analysis.selectedTags.length > 0) {
                  this.log('🔢 Counting test files...');
                  const testFileInfo = await this.countTestFilesForTags(analysis.selectedTags);
                  const combinedPattern = analysis.selectedTags.join('|');
                  const actualTestFiles = await this.countTestFilesForCombinedPattern(combinedPattern);
                  const totalSplits = this.calculateSplitsForActualFiles(actualTestFiles);

                  analysis.testFileInfo = testFileInfo;
                  analysis.totalSplits = totalSplits;
                }

                this.log(`✅ Analysis complete!`);
                return analysis;
              }

              this.log('⚠️ Failed to parse finalize_decision');
              return this.fallbackAnalysis(categorization.allFiles);
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult.substring(0, 50000)
            });
          }
        }

        this.conversationHistory.push({
          role: 'user',
          content: currentMessage
        });
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content
        });

        currentMessage = toolResults;

        continue;
      }


      const textContent = response.content.find((block: Anthropic.ContentBlock) => block.type === 'text');

      if (textContent && textContent.type === 'text') {
        const analysis = this.parseAgentDecision(textContent.text);

        if (analysis) {

          if (analysis.selectedTags.length > 0) {
            this.log('🔢 Counting test files...');
            const testFileInfo = await this.countTestFilesForTags(analysis.selectedTags);
            const combinedPattern = analysis.selectedTags.join('|');
            const actualTestFiles = await this.countTestFilesForCombinedPattern(combinedPattern);
            const totalSplits = this.calculateSplitsForActualFiles(actualTestFiles);

            analysis.testFileInfo = testFileInfo;
            analysis.totalSplits = totalSplits;
          }

          this.log(`✅ Analysis complete!`);
          return analysis;
        }
      }

      break;
    }

    this.log('⚠️ Using fallback analysis');
    return this.fallbackAnalysis(categorization.allFiles);
  }



  private defineTools(): Anthropic.Tool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the full content of a changed file to understand modifications',
        input_schema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to file (e.g. "app/core/Engine.ts")'
            },
            lines_limit: {
              type: 'number',
              description: 'Max lines to read (default: 2000)',
              default: 2000
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'get_git_diff',
        description: 'Get git diff for a file to see exact changes',
        input_schema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to file'
            },
            lines_limit: {
              type: 'number',
              description: 'Max diff lines (default: 1000)',
              default: 1000
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'get_pr_diff',
        description: 'Get full PR diff from GitHub (for analyzing live PRs)',
        input_schema: {
          type: 'object',
          properties: {
            pr_number: {
              type: 'number',
              description: 'PR number to fetch'
            },
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific files to get diff for (optional)'
            }
          },
          required: ['pr_number']
        }
      },
      {
        name: 'find_related_files',
        description: 'Find files related to a changed file to understand change impact depth. For CI files: finds workflows that call reusable workflows, scripts used in workflows, or workflows using specific scripts. For code files: finds importers, dependencies, tests.',
        input_schema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the changed file'
            },
            search_type: {
              type: 'string',
              enum: ['importers', 'imports', 'tests', 'module', 'ci', 'all'],
              description: 'Type of related files: importers (who uses this code), imports (what this uses), tests (test files), module (same directory), ci (CI relationships - reusable workflow callers, script usage), all (comprehensive)'
            },
            max_results: {
              type: 'number',
              description: 'Max files to return (default: 20)',
              default: 20
            }
          },
          required: ['file_path', 'search_type']
        }
      },
      {
        name: 'finalize_decision',
        description: 'Submit final tag selection decision',
        input_schema: {
          type: 'object',
          properties: {
            selected_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to run'
            },
            risk_level: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            confidence: {
              type: 'number',
              description: 'Confidence 0-100'
            },
            reasoning: {
              type: 'string',
              description: 'Detailed reasoning'
            },
            areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Affected areas'
            }
          },
          required: ['selected_tags', 'risk_level', 'confidence', 'reasoning', 'areas']
        }
      }
    ];
  }



  private async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<string> {
    try {
      switch (toolName) {
        case 'read_file': {
          const filePath = input.file_path as string;
          const linesLimit = (input.lines_limit as number) || 2000;
          const fullPath = join(this.baseDir, filePath);

          if (!existsSync(fullPath)) {
            return `File not found: ${filePath}`;
          }

          const content = readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          if (lines.length > linesLimit) {
            return `${filePath} (${lines.length} lines, showing first ${linesLimit}):\n\n${lines.slice(0, linesLimit).join('\n')}`;
          }

          return `${filePath} (${lines.length} lines):\n\n${content}`;
        }

        case 'get_git_diff': {
          const filePath = input.file_path as string;
          const linesLimit = (input.lines_limit as number) || 1000;

          try {
            const diff = execSync(`git diff HEAD~1 HEAD -- "${filePath}"`, {
              encoding: 'utf-8',
              cwd: this.baseDir
            });

            if (!diff) {
              return `No git diff available for ${filePath} (may be new/untracked)`;
            }

            const lines = diff.split('\n');
            if (lines.length > linesLimit) {
              return `Diff for ${filePath} (truncated to ${linesLimit} lines):\n${lines.slice(0, linesLimit).join('\n')}`;
            }

            return `Diff for ${filePath}:\n${diff}`;
          } catch {
            return `Could not get git diff for ${filePath}`;
          }
        }

        case 'get_pr_diff': {
          const prNumber = input.pr_number as number;
          const files = (input.files as string[]) || [];

          try {

            const diff = execSync(
              `gh pr diff ${prNumber} --repo metamask/metamask-mobile`,
              { encoding: 'utf-8' }
            );

            if (files.length > 0) {

              return this.filterDiffByFiles(diff, files);
            }


            const lines = diff.split('\n');
            if (lines.length > 2000) {
              return `PR #${prNumber} diff (truncated to 2000 lines):\n${lines.slice(0, 2000).join('\n')}`;
            }

            return `PR #${prNumber} diff:\n${diff}`;
          } catch {
            return `Could not fetch diff for PR #${prNumber}. Ensure gh CLI is authenticated.`;
          }
        }

        case 'find_related_files': {
          const filePath = input.file_path as string;
          const searchType = input.search_type as string;
          const maxResults = (input.max_results as number) || 20;

          const results: string[] = [];
          const isCI = filePath.includes('.github/workflows/') || filePath.includes('/scripts/');

          try {
            // CI-specific relationships
            if ((searchType === 'ci' || searchType === 'all') && isCI) {

              // For reusable workflows: find who calls them
              if (filePath.includes('.github/workflows/')) {
                const workflowName = filePath.split('/').pop();
                const fullPath = join(this.baseDir, filePath);

                // Check if this is a reusable workflow
                if (existsSync(fullPath)) {
                  const content = readFileSync(fullPath, 'utf-8');
                  const isReusable = content.includes('workflow_call');

                  if (isReusable && workflowName) {
                    // Find workflows that call this one
                    const callers = execSync(
                      `grep -r -l "uses:.*${workflowName}" .github/workflows/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
                      { encoding: 'utf-8', cwd: this.baseDir }
                    ).trim().split('\n').filter(f => f);

                    if (callers.length > 0) {
                      results.push(`🔄 Reusable Workflow - Called by ${callers.length} workflow(s):`);
                      results.push(...callers.map(f => `  ${f}`));
                    }
                  }

                  // Find what this workflow calls (other workflows)
                  const workflowCalls = content.match(/uses:\s*\.\/\.github\/workflows\/([^\s]+)/g) || [];

                  if (workflowCalls.length > 0) {
                    results.push(results.length > 0 ? '\n📤 Calls reusable workflows:' : '📤 Calls reusable workflows:');
                    const uniqueCalls = Array.from(new Set(workflowCalls));
                    uniqueCalls.slice(0, maxResults).forEach(call => {
                      const match = call.match(/uses:\s*\.\/\.github\/workflows\/([^\s]+)/);
                      if (match) results.push(`  .github/workflows/${match[1]}`);
                    });
                  }

                  // Find scripts used in this workflow
                  const scriptCalls = content.match(/(?:\.\/)?(?:scripts|\.github\/scripts)\/[^\s'"]+\.(?:sh|mjs|js|ts)/g) || [];
                  const uniqueScripts = Array.from(new Set(scriptCalls));

                  if (uniqueScripts.length > 0) {
                    results.push(results.length > 0 ? '\n📜 Executes scripts:' : '📜 Executes scripts:');
                    uniqueScripts.slice(0, maxResults).forEach(script =>
                      results.push(`  ${script.replace(/^\.\//, '')}`)
                    );
                  }
                }
              }

              // For scripts: find workflows that use them
              if (filePath.includes('/scripts/') || filePath.endsWith('.sh') || filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
                const scriptName = filePath.split('/').pop() || filePath;
                const scriptPath = filePath.replace(/^\.\//, '');

                const workflowsUsingScript = execSync(
                  `grep -r -l -E "${scriptPath}|${scriptName}" .github/workflows/ 2>/dev/null | head -${maxResults} || true`,
                  { encoding: 'utf-8', cwd: this.baseDir }
                ).trim().split('\n').filter(f => f);

                if (workflowsUsingScript.length > 0) {
                  results.push(results.length > 0 ? '\n⚙️  Script used in workflows:' : '⚙️  Script used in workflows:');
                  results.push(...workflowsUsingScript.map(f => `  ${f}`));
                }

                // Check if script is used in other scripts
                const scriptsDir = filePath.includes('.github/scripts') ? '.github/scripts' : 'scripts';
                const otherScriptsUsing = execSync(
                  `grep -r -l "${scriptName}" ${scriptsDir}/ 2>/dev/null | grep -v "${filePath}" | head -${maxResults} || true`,
                  { encoding: 'utf-8', cwd: this.baseDir }
                ).trim().split('\n').filter(f => f);

                if (otherScriptsUsing.length > 0) {
                  results.push(results.length > 0 ? '\n🔗 Referenced in other scripts:' : '🔗 Referenced in other scripts:');
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
                  { encoding: 'utf-8', cwd: this.baseDir }
                ).trim().split('\n').filter(f => f);

                if (importers.length > 0) {
                  results.push(results.length > 0 ? `\n📥 Importers (${importers.length} files depend on this):` : `📥 Importers (${importers.length} files depend on this):`);
                  results.push(...importers.map(f => `  ${f}`));
                }
              }
            }

            // Find what this file imports (dependencies)
            if ((searchType === 'imports' || searchType === 'all') && !isCI) {
              const fullPath = join(this.baseDir, filePath);
              if (existsSync(fullPath)) {
                const content = readFileSync(fullPath, 'utf-8');
                const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
                const relativeImports = imports
                  .map(imp => imp.match(/from\s+['"]([^'"]+)['"]/)?.[1])
                  .filter(imp => imp && (imp.startsWith('./') || imp.startsWith('../')))
                  .slice(0, maxResults);

                if (relativeImports.length > 0) {
                  results.push(results.length > 0 ? `\n📦 Imports (${relativeImports.length} local dependencies):` : `📦 Imports (${relativeImports.length} local dependencies):`);
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
                  { encoding: 'utf-8', cwd: this.baseDir }
                ).trim().split('\n').filter(f => f);

                if (testFiles.length > 0) {
                  results.push(results.length > 0 ? `\n🧪 Test files (${testFiles.length}):` : `🧪 Test files (${testFiles.length}):`);
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
                  { encoding: 'utf-8', cwd: this.baseDir }
                ).trim().split('\n').filter(f => f);

                if (moduleFiles.length > 0) {
                  results.push(results.length > 0 ? `\n📁 Same module (${directory}):` : `📁 Same module (${directory}):`);
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

        case 'finalize_decision': {
          return JSON.stringify(input);
        }

        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error) {
      return `Tool error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }



  private buildSystemPrompt(): string {
    return `You are an expert E2E test selector for MetaMask Mobile.

GOAL: Analyze code changes and select appropriate smoke test tags to run.

AVAILABLE TAGS:
${this.pipelineTags.map(tag => `- ${tag}`).join('\n')}

TAG COVERAGE:
- SmokeConfirmations: Transaction confirmations, send/receive, signatures
- SmokeConfirmationsRedesigned: New confirmation UI as well as all confirmation flows
- SmokeTrade: Token swaps, DEX trading
- SmokeWalletPlatform: Core wallet, accounts, network switching
- SmokeIdentity: User identity, authentication
- SmokeAccounts: Multi-account, account management
- SmokeNetworkAbstractions: Network layer, multi-chain
- SmokeNetworkExpansion: New networks, network config (Solana, Bitcoin, etc)

TOOLS AVAILABLE:
- read_file: Read actual file content
- get_git_diff: See exact code changes
- get_pr_diff: Get full PR diff (for live PRs)
- find_related_files: Discover impact depth and relationships
  * For CI files: finds reusable workflow callers, script usage in workflows
  * For code files: finds importers (dependents), dependencies, tests, module files
  * Use search_type='ci' for workflow/script relationships
  * Use search_type='importers' to find who depends on code changes
  * Use search_type='all' for comprehensive relationship analysis
- finalize_decision: Submit your selection

REASONING APPROACH:
You have extended thinking enabled (10,000 tokens). Use it to:
- Think deeply about change impacts
- Consider direct and indirect effects
- Reason about risk levels
- Map changes to test coverage

WORKFLOW:
1. Review the changed files
2. For critical files (Engine, controllers, core), examine actual changes
3. For critical changes or CI files, use find_related_files to understand impact depth:
   - CI files: Use search_type='ci' to find workflow callers and script usage
   - Core code: Use search_type='importers' to find dependents
   - When unsure about impact: Use search_type='all' for comprehensive view
4. Use get_git_diff to see specific modifications if needed
5. Think about what functionality is affected
6. Select appropriate tags
7. Call finalize_decision with your analysis

RISK ASSESSMENT:
- Low: Pure documentation, README, comments
- Medium: UI changes, new components, utilities
- High: Core modules, controllers, Engine
- Critical: Dependencies, critical paths, security
- Still consider tests for low/medium changes if they affect user flows or testing infrastructure

SPECIAL CASES:
- CI/CD changes (workflows, bitrise, actions): ALWAYS investigate deeply
  * For reusable workflows (.github/workflows with workflow_call):
    Use find_related_files with search_type='ci' to find all callers
    If widely used (>5 callers) → HIGH RISK → run comprehensive tests
  * For scripts (scripts/, .github/scripts/):
    Use find_related_files to find all workflows using the script
    If used in test/build workflows → consider running affected test tags
  * For workflow changes: Read the diff to understand what's being modified
    If test execution logic changes → HIGH RISK
- Test file changes: Usually safe, but examine what's being tested
- Config changes: May affect runtime behavior, investigate carefully

SELECTION GUIDANCE:
- Use your judgment on whether tests are needed - 0 tags is perfectly acceptable for genuine non-functional changes
- Critical files (package.json, controllers, Engine) should almost always trigger tests
- Reading actual diffs (get_git_diff) provides better context than filenames alone
- For CI files: Use find_related_files first, then assess impact breadth
- If a reusable workflow or widely-used script changes → likely HIGH impact

Be thorough but efficient. Use your judgment.

When confident in your decision, use finalize_decision to complete.`;
  }



  private buildAgentPrompt(
    categorization: ReturnType<typeof this.categorizeFiles>,
    prNumber?: number
  ): string {
    const { allFiles, criticalFiles, categories, summary, hasCriticalChanges } = categorization;


    const fileList: string[] = [];

    if (criticalFiles.length > 0) {
      fileList.push('⚠️  CRITICAL FILES (must examine):');
      criticalFiles.forEach(f => fileList.push(`  CRITICAL ${f}`));
      fileList.push('');
    }

    if (categories.core.length > 0 && !criticalFiles.some(f => categories.core.includes(f))) {
      fileList.push('Core/Controllers:');
      categories.core.slice(0, 10).forEach(f => fileList.push(`  ${f}`));
      if (categories.core.length > 10) fileList.push(`  ... and ${categories.core.length - 10} more`);
      fileList.push('');
    }

    if (categories.app.length > 0) {
      fileList.push('App Code:');
      categories.app.slice(0, 15).forEach(f => fileList.push(`  ${f}`));
      if (categories.app.length > 15) fileList.push(`  ... and ${categories.app.length - 15} more`);
      fileList.push('');
    }

    if (categories.ci.length > 0) {
      fileList.push('CI/CD:');
      categories.ci.forEach(f => fileList.push(`  ${f}`));
      fileList.push('');
    }


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

${prNumber ? `Use get_pr_diff(${prNumber}) to see actual changes.\n` : ''}
${criticalFiles.length > 0 ? `⚠️  CRITICAL FILES DETECTED - Examine these carefully using read_file or get_git_diff.\n` : ''}
Investigate thoroughly. Use tools as needed.
Think deeply about impacts.

IMPORTANT: Use your judgment on whether tests are needed.
- If changes are genuinely non-functional, then 0 tags is fine.
- If functional code changes → select relevant tags
- Critical files (marked CRITICAL) should almost always trigger tests

Call finalize_decision when ready.`;
  }



  private parseAgentDecision(response: string): AIAnalysis | null {
    const jsonMatch = response.match(/\{[\s\S]*"selected_tags"[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        const validTags = (parsed.selected_tags || []).filter((tag: string) =>
          this.pipelineTags.includes(tag)
        );

        return {
          riskLevel: parsed.risk_level || 'medium',
          selectedTags: validTags,
          areas: parsed.areas || [],
          reasoning: parsed.reasoning || 'Analysis completed',
          confidence: Math.min(100, Math.max(0, parsed.confidence || 75))
        };
      } catch {
        return null;
      }
    }

    return null;
  }



  private fallbackAnalysis(changedFiles: string[]): AIAnalysis {
    this.log('⚠️ AI analysis failed or did not converge - running all available test tags');

    return {
      riskLevel: 'high',
      selectedTags: this.pipelineTags,
      areas: ['all'],
      reasoning: `Fallback: AI analysis did not complete successfully. Running all ${this.pipelineTags.length} available test tags to ensure comprehensive coverage for ${changedFiles.length} changed files.`,
      confidence: 0
    };
  }



  private async countTestFilesForTags(tagList: string[]): Promise<TagTestInfo[]> {
    const tagInfo: TagTestInfo[] = [];
    const baseDir = join(this.baseDir, 'e2e', 'specs');

    for (const tag of tagList) {
      try {
        const findCommand = `find "${baseDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tag})\\b" {} \\; | sort -u`;

        const testFiles = execSync(findCommand, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim().split('\n').filter(f => f);

        const recommendedSplits = testFiles.length > 0
          ? Math.min(Math.ceil(testFiles.length / 3.5), 5)
          : 0;

        tagInfo.push({
          tag,
          testFiles,
          fileCount: testFiles.length,
          recommendedSplits
        });
      } catch {
        tagInfo.push({
          tag,
          testFiles: [],
          fileCount: 0,
          recommendedSplits: 0
        });
      }
    }

    return tagInfo;
  }

  private async countTestFilesForCombinedPattern(tagPattern: string): Promise<string[]> {
    const baseDir = join(this.baseDir, 'e2e', 'specs');

    try {
      const findCommand = `find "${baseDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tagPattern})\\b" {} \\; | sort -u`;

      const testFiles = execSync(findCommand, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim().split('\n').filter(f => f);

      return testFiles;
    } catch {
      return [];
    }
  }

  private calculateSplitsForActualFiles(testFiles: string[]): number {
    const totalFiles = testFiles.length;
    if (totalFiles === 0) return 0;

    let splits = Math.ceil(totalFiles / 4);
    if (splits > totalFiles / 2) {
      splits = Math.ceil(totalFiles / 2);
    }

    return Math.min(splits, 20);
  }



  private filterDiffByFiles(diff: string, files: string[]): string {
    const fileDiffs: string[] = [];
    const sections = diff.split('diff --git');

    for (const section of sections) {
      if (!section.trim()) continue;

      for (const file of files) {
        if (section.includes(file)) {
          fileDiffs.push('diff --git' + section);
          break;
        }
      }
    }

    return fileDiffs.join('\n\n') || 'No diffs found for specified files';
  }

  private categorizeFiles(files: string[]): {
    allFiles: string[];
    criticalFiles: string[];
    categories: {
      app: string[];
      core: string[];
      dependencies: string[];
      config: string[];
      ci: string[];
      tests: string[];
      docs: string[];
      assets: string[];
      other: string[];
    };
    summary: Record<string, number>;
    hasCriticalChanges: boolean;
  } {

    const criticalFiles = files.filter(file =>
      file === 'package.json' ||
      file.includes('yarn.lock') ||
      file.includes('package-lock.json') ||
      file.includes('core/Engine') ||
      file.includes('core/AppConstants') ||
      file.includes('Controller') && !file.includes('test')
    );

    const categories: {
      app: string[];
      core: string[];
      dependencies: string[];
      config: string[];
      ci: string[];
      tests: string[];
      docs: string[];
      assets: string[];
      other: string[];
    } = {
      app: files.filter(f => f.startsWith('app/') && !f.includes('/images/') && !f.includes('/fonts/')),
      core: files.filter(f =>
        f.includes('core/Engine') ||
        f.includes('core/AppConstants') ||
        f.includes('Controller') ||
        f.includes('redux/') ||
        f.includes('store/')
      ),
      dependencies: files.filter(f =>
        f.includes('yarn.lock') ||
        f.includes('package-lock.json') ||
        f === 'package.json'
      ),
      config: files.filter(f =>
        f.includes('.config') ||
        f.includes('tsconfig') ||
        f.includes('babel.config') ||
        f.includes('metro.config')
      ),
      ci: files.filter(f =>
        f.includes('.github/workflows') ||
        f.includes('.bitrise') ||
        f.includes('bitrise.yml')
      ),
      tests: files.filter(f =>
        f.includes('e2e/') ||
        f.includes('.test.') ||
        f.includes('.spec.') ||
        f.includes('__tests__/')
      ),
      docs: files.filter(f =>
        f.endsWith('.md') ||
        f.startsWith('docs/')
      ),
      assets: files.filter(f =>
        f.includes('/images/') ||
        f.includes('/fonts/') ||
        f.endsWith('.png') ||
        f.endsWith('.jpg') ||
        f.endsWith('.svg')
      ),
      other: []
    };


    const categorized = new Set([
      ...categories.app,
      ...categories.core,
      ...categories.dependencies,
      ...categories.config,
      ...categories.ci,
      ...categories.tests,
      ...categories.docs,
      ...categories.assets
    ]);
    categories.other = files.filter(f => !categorized.has(f));

    const summary = {
      app: categories.app.length,
      core: categories.core.length,
      dependencies: categories.dependencies.length,
      config: categories.config.length,
      ci: categories.ci.length,
      tests: categories.tests.length,
      docs: categories.docs.length,
      assets: categories.assets.length,
      other: categories.other.length
    };

    const hasCriticalChanges = criticalFiles.length > 0 || categories.core.length > 0;

    return {
      allFiles: files,
      criticalFiles,
      categories,
      summary,
      hasCriticalChanges
    };
  }

  private getChangedFiles(baseBranch: string, includeMainChanges: boolean): string[] {
    try {
      const targetBranch = baseBranch || 'origin/main';
      const syntax = includeMainChanges ? '..' : '...';

      const changedFiles = execSync(`git diff --name-only ${targetBranch}${syntax}HEAD`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim().split('\n').filter(f => f);

      return changedFiles;
    } catch {
      return [];
    }
  }

  private getPRFiles(prNumber: number): string[] {
    try {
      const files = execSync(
        `gh pr view ${prNumber} --json files --jq '.files[].path'`,
        { encoding: 'utf-8' }
      ).trim().split('\n').filter(f => f);

      return files;
    } catch (error) {
      console.error(`❌ Failed to fetch files for PR #${prNumber}. Ensure gh CLI is authenticated.`);
      return [];
    }
  }



  private outputResults(
    analysis: AIAnalysis,
    options: ParsedArgs,
    categorization: ReturnType<typeof this.categorizeFiles>
  ): void {
    if (options.output === 'json') {

      console.log(JSON.stringify({
        selectedTags: analysis.selectedTags,
        riskLevel: analysis.riskLevel,
        totalSplits: analysis.totalSplits,
        testFileBreakdown: analysis.testFileInfo?.map(info => ({
          tag: info.tag,
          fileCount: info.fileCount,
          recommendedSplits: info.recommendedSplits
        })),
        changedFiles: {
          total: categorization.allFiles.length,
          relevant: categorization.allFiles.length,
          filteredOut: 0
        },
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      }, null, 2));
    } else if (options.output === 'tags') {
      console.log(analysis.selectedTags.join('\n'));
    } else {

      console.log('🤖 AI E2E Tag Selector');
      console.log('===================================');
      console.log(`🎯 Risk level: ${analysis.riskLevel}`);
      console.log(`✅ Selected ${analysis.selectedTags.length} tags: ${analysis.selectedTags.join(', ')}`);
      console.log(`📊 Confidence: ${analysis.confidence}%`);
      console.log(`💭 Reasoning: ${analysis.reasoning}`);

      if (analysis.testFileInfo && analysis.totalSplits) {
        console.log(`\n📈 Test File Analysis:`);
        analysis.testFileInfo.forEach(info => {
          console.log(`   ${info.tag}: ${info.fileCount} files → ${info.recommendedSplits} splits`);
        });
        console.log(`🔢 Total splits: ${analysis.totalSplits}`);
      }

      const iosCommand = `yarn test:e2e:ios:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      const androidCommand = `yarn test:e2e:android:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      console.log(`\n💡 iOS: ${iosCommand}`);
      console.log(`💡 Android: ${androidCommand}`);
    }
  }



  private parseArgs(args: string[]): ParsedArgs {
    const options: ParsedArgs = {
      baseBranch: 'origin/main',
      dryRun: false,
      verbose: false,
      output: 'default',
      includeMainChanges: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--base-branch':
        case '-b':
          options.baseBranch = args[++i];
          break;
        case '--dry-run':
        case '-d':
          options.dryRun = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--output':
        case '-o':
          options.output = args[++i] as ParsedArgs['output'];
          break;
        case '--include-main-changes':
        case '--include-main':
          options.includeMainChanges = true;
          break;
        case '--changed-files':
          options.changedFiles = args[++i];
          break;
        case '--pr':
          options.prNumber = parseInt(args[++i]);
          break;
      }
    }

    return options;
  }



  private showHelp(): void {
    console.log(`
AI E2E Tag Selector
Usage: yarn ai-e2e [options]

Options:
  -b, --base-branch <branch>    Base branch for comparison (default: origin/main)
  -d, --dry-run                 Dry run mode
  -v, --verbose                 Verbose output
  -o, --output <mode>           Output mode: default|json|tags (default: default)
  --include-main-changes        Include main branch changes
  --changed-files <files>       Provide changed files directly
  --pr <number>                 Analyze specific PR number
  -h, --help                    Show this help message

Examples:
  # Analyze current branch (compares HEAD to origin/main)
  yarn ai-e2e

  # Analyze with explicit files
  yarn ai-e2e --changed-files "app/core/Engine.ts"

  # Analyze specific PR (fetches diff from GitHub)
  yarn ai-e2e --pr 12345

  # JSON output for CI/CD
  yarn ai-e2e --output json
    `);
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);


    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      process.exit(0);
    }

    const options = this.parseArgs(args);

    this.isQuietMode = options.output === 'json' || options.output === 'tags';


    let allChangedFiles: string[];
    if (options.changedFiles) {
      this.log('📋 Using provided changed files');
      allChangedFiles = options.changedFiles.split(/\s+/).filter(f => f);
    } else if (options.prNumber) {
      this.log(`📋 Fetching changed files from PR #${options.prNumber}`);
      allChangedFiles = this.getPRFiles(options.prNumber);
    } else {
      this.log('📋 Computing changed files via git');
      allChangedFiles = this.getChangedFiles(options.baseBranch, options.includeMainChanges);
    }

    const categorization = this.categorizeFiles(allChangedFiles);

    this.log(`📁 Found ${allChangedFiles.length} total files`);
    if (categorization.criticalFiles.length > 0) {
      this.log(`⚠️  ${categorization.criticalFiles.length} critical files detected`);
    }


    const analysis = await this.analyzeWithAgent(categorization, options.prNumber);


    this.outputResults(analysis, options, categorization);
  }
}



if (require.main === module) {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;

  if (!apiKey) {
    console.error('❌ E2E_CLAUDE_API_KEY not set');
    process.exit(1);
  }

  const selector = new AIE2ETagsSelector(apiKey);
  selector.run().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export default AIE2ETagsSelector;
