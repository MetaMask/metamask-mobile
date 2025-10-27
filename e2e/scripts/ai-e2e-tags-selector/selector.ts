/**
 * AI E2E Tags Selector
 *
 * Main orchestrator class that uses AI to analyze code changes
 * and select appropriate E2E smoke test tags
 */

import Anthropic from '@anthropic-ai/sdk';
import { aiE2EConfig } from '../../tags';
import { AIAnalysis, FileCategorization, ParsedArgs, ToolInput } from './types';
import { categorizeFiles } from './analysis/file-categorizer';
import {
  countTestFilesForTags,
  countTestFilesForCombinedPattern,
  calculateSplitsForActualFiles
} from './analysis/tag-analyzer';
import { parseAgentDecision, createFallbackAnalysis } from './analysis/decision-parser';
import { getToolDefinitions } from './tools/tool-registry';
import { executeTool } from './tools/tool-executor';
import { buildSystemPrompt } from './prompts/system-prompt-builder';
import { buildAgentPrompt } from './prompts/agent-prompt-builder';
import { getChangedFiles, getPRFiles } from './utils/git-utils';
import { validatePRNumber } from './utils/validation';
import { formatAndOutput, createLogger } from './utils/output-formatter';

export class AIE2ETagsSelector {
  private anthropic: Anthropic;
  private readonly pipelineTags: string[];
  private readonly availableTags: string[];
  private isQuietMode = false;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private readonly baseDir = process.cwd();
  private baseBranch = 'origin/main';
  private includeMainChanges = false;
  private log: (message: string) => void;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    const tags = aiE2EConfig.map(config => config.tag);
    this.pipelineTags = tags;
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
    categorization: FileCategorization,
    options: { prNumber?: number; baseBranch?: string; includeMainChanges?: boolean }
  ): Promise<AIAnalysis> {
    this.log('🤖 Starting AI analysis for E2E tests...');

    // Store context for tool execution
    if (options.baseBranch) this.baseBranch = options.baseBranch;
    if (options.includeMainChanges !== undefined)
      this.includeMainChanges = options.includeMainChanges;

    const tools = getToolDefinitions();
    this.conversationHistory = [];

    const initialPrompt = buildAgentPrompt(categorization, options.prNumber);

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
        system: buildSystemPrompt(),
        tools,
        messages: [...this.conversationHistory, { role: 'user', content: currentMessage }]
      });

      // Log thinking (if present)
      const thinking = response.content.find(
        (block: Anthropic.ContentBlock) => block.type === 'thinking'
      );
      if (thinking && 'thinking' in thinking && !this.isQuietMode) {
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
                baseBranch: this.baseBranch,
                includeMainChanges: this.includeMainChanges
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

              const analysis = parseAgentDecision(toolResult, this.pipelineTags);
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
              return createFallbackAnalysis(categorization.allFiles, this.pipelineTags);
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
        const analysis = parseAgentDecision(textContent.text, this.pipelineTags);

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
    return createFallbackAnalysis(categorization.allFiles, this.pipelineTags);
  }

  /**
   * Parses command line arguments
   */
  parseArgs(args: string[]): ParsedArgs {
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

    this.isQuietMode = options.output === 'json' || options.output === 'tags';
    this.log = createLogger(this.isQuietMode);

    // Get changed files
    let allChangedFiles: string[];
    if (options.changedFiles) {
      this.log('📋 Using provided changed files');
      allChangedFiles = options.changedFiles.split(/\s+/).filter(f => f);
    } else if (options.prNumber) {
      this.log(`📋 Fetching changed files from PR #${options.prNumber}`);
      allChangedFiles = getPRFiles(options.prNumber);
    } else {
      this.log('📋 Computing changed files via git');
      allChangedFiles = getChangedFiles(
        options.baseBranch,
        options.includeMainChanges,
        this.baseDir
      );
    }

    const categorization = categorizeFiles(allChangedFiles);

    this.log(`📁 Found ${allChangedFiles.length} total files`);
    if (categorization.criticalFiles.length > 0) {
      this.log(`⚠️  ${categorization.criticalFiles.length} critical files detected`);
    }

    // Run AI analysis
    const analysis = await this.analyzeWithAgent(categorization, {
      prNumber: options.prNumber,
      baseBranch: options.baseBranch,
      includeMainChanges: options.includeMainChanges
    });

    // Output results
    formatAndOutput(analysis, options, categorization);
  }
}

export default AIE2ETagsSelector;
