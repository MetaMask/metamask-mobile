/**
 * AI E2E Tags Selector
 *
 * Main orchestrator class that uses AI to analyze code changes
 * and select appropriate E2E smoke test tags
 */

import Anthropic from '@anthropic-ai/sdk';
import { aiE2EConfig } from '../../tags';
import { AIAnalysis, FileCategorization, ParsedArgs, ToolInput } from './types';
import { CLAUDE_CONFIG, APP_CONFIG } from './config';
import { categorizeFiles } from './analysis/file-categorizer';
import {
  countTestFilesForTags,
  countTestFilesForCombinedPattern,
  calculateSplitsForActualFiles
} from './analysis/tag-analyzer';
import { parseAgentDecision, createFallbackAnalysis } from './analysis/decision-parser';
import { getToolDefinitions } from './ai-tools/tool-registry';
import { executeTool } from './ai-tools/tool-executor';
import { buildSystemPrompt } from './prompts/system-prompt-builder';
import { buildAgentPrompt } from './prompts/agent-prompt-builder';
import { getAllChangedFiles, getPRFiles, validatePRNumber } from './utils/git-utils';
import { formatAndOutput, createLogger } from './utils/output-formatter';

export class AIE2ETagsSelector {
  private anthropic: Anthropic;
  private readonly availableTags: string[];
  private isQuietMode = false;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private readonly baseDir = process.cwd();
  private baseBranch = APP_CONFIG.defaultBaseBranch;
  private githubRepo = APP_CONFIG.githubRepo;
  private log: (message: string) => void;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    const tags = aiE2EConfig.map(config => config.tag);
    this.availableTags = tags;
    this.log = createLogger(false);

    if (this.availableTags.length === 0) {
      throw new Error('No tags found in aiE2EConfig in e2e/tags.js');
    }
  }

  /**
   * Main analysis method using AI agent with tools
   */
  async analyzeWithAgent(
    categorization: FileCategorization
  ): Promise<AIAnalysis> {

    const tools = getToolDefinitions();
    const initialPrompt = buildAgentPrompt(categorization);
    let currentMessage: string | Anthropic.MessageParam['content'] = initialPrompt;
    this.conversationHistory = [];

    for (let iteration = 0; iteration < CLAUDE_CONFIG.maxIterations; iteration++) {
      this.log(`🔄 Iteration ${iteration + 1}/${CLAUDE_CONFIG.maxIterations}...`);

      const response: Anthropic.Message = await this.anthropic.messages.create({
        model: CLAUDE_CONFIG.model,
        max_tokens: CLAUDE_CONFIG.maxTokens,
        thinking: {
          type: 'enabled',
          budget_tokens: CLAUDE_CONFIG.thinkingBudgetTokens
        },
        system: buildSystemPrompt(),
        tools,
        messages: [...this.conversationHistory, { role: 'user', content: currentMessage }]
      });

      // Log thinking (if present)
      const thinking = response.content.find(
        (block: Anthropic.ContentBlock) => block.type === 'thinking'
      );
      if (thinking && 'thinking' in thinking) {
        this.log(`💭 ${thinking.thinking.substring(0, 200)}...`);
      }

      // Handle tool uses
      const toolUseBlocks = response.content.filter(
        (block: Anthropic.ContentBlock) => block.type === 'tool_use'
      );

      if (toolUseBlocks.length > 0) {
        const toolResults: Anthropic.MessageParam['content'] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type === 'tool_use') {
            this.log(`🔧 Tool: ${toolUse.name}`);

            const toolResult = await executeTool(
              toolUse.name,
              toolUse.input as ToolInput,
              {
                baseDir: this.baseDir,
                baseBranch: this.baseBranch
              }
            );

            // Handle finalize_decision
            if (toolUse.name === 'finalize_decision') {
              if (!this.isQuietMode) {
                try {
                  const parsed = JSON.parse(toolResult);
                  this.log(
                    `📝 Agent decision: confidence=${parsed.confidence}%, risk=${parsed.risk_level}, tags=${parsed.selected_tags?.length || 0}`
                  );
                } catch {
                  // Ignore parse errors in logging
                }
              }

              const analysis = parseAgentDecision(toolResult);
              if (analysis) {
                // Add test file info
                if (analysis.selectedTags.length > 0) {
                  this.log('🔢 Counting test files...');
                  const testFileInfo = await countTestFilesForTags(
                    analysis.selectedTags,
                    this.baseDir
                  );
                  const combinedPattern = analysis.selectedTags.join('|');
                  const actualTestFiles = await countTestFilesForCombinedPattern(
                    combinedPattern,
                    this.baseDir
                  );
                  const totalSplits = calculateSplitsForActualFiles(actualTestFiles);

                  analysis.testFileInfo = testFileInfo;
                  analysis.totalSplits = totalSplits;
                }

                this.log(`✅ Analysis complete!`);
                return analysis;
              }

              this.log('⚠️ Failed to parse finalize_decision');
              return createFallbackAnalysis(categorization.allFiles, this.availableTags);
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult.substring(0, 50000)
            });
          }
        }

        // Update conversation history
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

      // Handle text response (fallback)
      const textContent = response.content.find(
        (block: Anthropic.ContentBlock) => block.type === 'text'
      );

      if (textContent && textContent.type === 'text') {
        const analysis = parseAgentDecision(textContent.text);

        if (analysis) {
          // Add test file info
          if (analysis.selectedTags.length > 0) {
            this.log('🔢 Counting test files...');
            const testFileInfo = await countTestFilesForTags(
              analysis.selectedTags,
              this.baseDir
            );
            const combinedPattern = analysis.selectedTags.join('|');
            const actualTestFiles = await countTestFilesForCombinedPattern(
              combinedPattern,
              this.baseDir
            );
            const totalSplits = calculateSplitsForActualFiles(actualTestFiles);

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
    return createFallbackAnalysis(categorization.allFiles, this.availableTags);
  }

  /**
   * Validates provided files against actual git changes
   */
  private validateProvidedFiles(providedFiles: string[]): string[] {
    this.log('🔍 Validating provided files have changes...');
    const actuallyChangedFiles = getAllChangedFiles(this.baseBranch, this.baseDir);
    const invalidFiles = providedFiles.filter(f => !actuallyChangedFiles.includes(f));

    if (invalidFiles.length > 0) {
      console.error(`❌ Error: The following files have no changes or do not exist:`);
      invalidFiles.forEach(f => console.error(`   - ${f}`));
      console.error(`\n💡 Tip: Only provide files that have actual changes in your branch`);
      process.exit(1);
    }

    this.log(`✅ All ${providedFiles.length} provided files validated`);
    return providedFiles;
  }

  /**
   * Parses command line arguments
   */
  parseArgs(args: string[]): ParsedArgs {
    const options: ParsedArgs = {
      baseBranch: APP_CONFIG.defaultBaseBranch,
      output: 'console'
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--base-branch':
        case '-b':
          options.baseBranch = args[++i];
          break;
        case '--output':
        case '-o':
          options.output = args[++i] as ParsedArgs['output'];
          break;
        case '--changed-files':
          options.changedFiles = args[++i];
          break;
        case '--pr': {
          const prInput = args[++i];
          const validPR = validatePRNumber(prInput);
          if (!validPR) {
            console.error(
              `❌ Invalid PR number: ${prInput}. Must be a positive integer (1-999999).`
            );
            process.exit(1);
          }
          options.prNumber = validPR;
          break;
        }
      }
    }

    return options;
  }

  /**
   * Shows help message
   */
  showHelp(): void {
    console.log(`
Smart E2E test selector based on code changes

AI flow (using the provided tools and context):
1. AI gets list of changed files: "Engine.ts, Logger.ts"
2. AI thinks: "Engine is critical, let me check"
   → Calls: get_git_diff("Engine.ts")
3. AI sees: "Changed transaction handling"
   → Calls: find_related_files("Engine.ts", "importers")
4. AI discovers: "Used by 50+ files!"
5. AI decides: "This is HIGH RISK"
   → Calls: finalize_decision({
       selected_tags: ["SmokeCore", "SmokeAccounts"],
       risk_level: "high",
       ...
     })

Local usage: yarn ai-e2e [options]

Options:
  -b, --base-branch <branch>    Base branch for comparison (default: origin/main)
  -o, --output <mode>           Output mode: console|json (default: console)
  --changed-files <files>       Provide changed files directly (default: git diff to check all changed files)
  --pr <number>                 Get the changed files from a specific PR
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

  /**
   * Main run method
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);

    // Handle help
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      process.exit(0);
    }

    const options = this.parseArgs(args);

    // Set instance properties from options
    this.baseBranch = options.baseBranch;
    this.isQuietMode = options.output === 'json';
    this.log = createLogger(this.isQuietMode);

    // Get changed files
    let allChangedFiles: string[];
    if (options.changedFiles) {
      const providedFiles = options.changedFiles.split(/\s+/).filter(f => f);
      allChangedFiles = this.validateProvidedFiles(providedFiles);
    } else if (options.prNumber) {
      allChangedFiles = getPRFiles(options.prNumber, this.githubRepo);
    } else {
      allChangedFiles = getAllChangedFiles(this.baseBranch, this.baseDir);
    }
    this.log(`📁 Found ${allChangedFiles.length} modified files`);

    // Validate we have files to analyze
    if (allChangedFiles.length === 0) {
      this.log('💡 Tip: Make sure you have uncommitted changes or are on a branch with commits');

      const noChangesAnalysis: AIAnalysis = {
        selectedTags: [],
        riskLevel: 'low',
        confidence: 100,
        reasoning: 'No files changed - no tests needed',
        areas: []
      };
      formatAndOutput(noChangesAnalysis, options, categorizeFiles([]));
      return;
    }

    const categorization = categorizeFiles(allChangedFiles); //TODO!
    if (categorization.criticalFiles.length > 0) {
      this.log(`⚠️  ${categorization.criticalFiles.length} critical files detected`);
    }

    // Run AI analysis
    const analysis = await this.analyzeWithAgent(categorization);

    // Output results
    formatAndOutput(analysis, options, categorization);
  }
}

export default AIE2ETagsSelector;
