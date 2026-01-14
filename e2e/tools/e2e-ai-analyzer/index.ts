/**
 * E2E AI Analyzer - Entry Point
 *
 * AI-powered E2E test analysis with multiple operation modes.
 * Supports multiple LLM providers with automatic fallback.
 */

import { ParsedArgs } from './types';
import { APP_CONFIG, LLM_CONFIG } from './config';
import {
  getAllChangedFiles,
  getPRFiles,
  validatePRNumber,
} from './utils/git-utils';
import { MODES, validateMode, analyzeWithAgent } from './analysis/analyzer';
import { identifyCriticalFiles } from './utils/file-utils';
import {
  getAvailableProviders,
  createProvider,
  getSupportedProviders,
  ILLMProvider,
  ProviderType,
} from './providers';

/**
 * Validates provided files against actual git changes
 */
function validateProvidedFiles(
  providedFiles: string[],
  baseBranch: string,
  baseDir: string,
): string[] {
  console.log('🔍 Validating provided files have changes...');
  const actuallyChangedFiles = getAllChangedFiles(baseBranch, baseDir);
  const invalidFiles = providedFiles.filter(
    (f) => !actuallyChangedFiles.includes(f),
  );

  if (invalidFiles.length > 0) {
    console.error(
      `❌ Error: The following files have no changes or do not exist:`,
    );
    invalidFiles.forEach((f) => console.error(`   - ${f}`));
    console.error(
      `\n💡 Tip: Only provide files that have actual changes in your branch`,
    );
    process.exit(1);
  }

  console.log(`✅ All ${providedFiles.length} provided files validated`);
  return providedFiles;
}

/**
 * Parses command line arguments
 */
function parseArgs(args: string[]): ParsedArgs {
  const options: ParsedArgs = {
    baseBranch: APP_CONFIG.defaultBaseBranch,
    mode: 'select-tags',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--mode':
      case '-m':
        options.mode = args[++i];
        break;
      case '--base-branch':
      case '-b':
        options.baseBranch = args[++i];
        break;
      case '--changed-files':
      case '-cf':
        options.changedFiles = args[++i];
        break;
      case '--pr':
      case '-pr': {
        const prInput = args[++i];
        const validPR = validatePRNumber(prInput);
        if (!validPR) {
          console.error(
            `❌ Invalid PR number: ${prInput}. Must be a positive integer (1-999999).`,
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
function showHelp(): void {
  const modeList = Object.entries(MODES)
    .map(([key, mode]) => `  ${key.padEnd(20)} ${mode.description}`)
    .join('\n');

  const providerList = getSupportedProviders()
    .map((p) => {
      const config = LLM_CONFIG.providers[p];
      return `  ${p.padEnd(12)} ${config.envKey.padEnd(24)} ${config.model}`;
    })
    .join('\n');

  console.log(`
Smart E2E AI Analyzer

AVAILABLE MODES:
${modeList}

SUPPORTED LLM PROVIDERS (in priority order):
${providerList}

The analyzer will automatically use the first available provider.
Set the appropriate API key environment variable to enable a provider.

AI AGENTIC FLOW:
1. AI gets list of changed files and act depending on the mode
2. AI calls tools to investigate (get_git_diff, find_related_files, etc.)
3. AI thinks deeply about impacts and provides a decision

Usage: node -r esbuild-register e2e/tools/e2e-ai-analyzer [options]

Options:
  -m, --mode <mode>             Analysis mode (default: select-tags)
  -b, --base-branch <branch>    Base branch for comparison (default: origin/main)
  -cf --changed-files <files>   Provide changed files directly
  -pr --pr <number>             Get changed files from a specific PR
  -h, --help                    Show this help message

Output:
  - each mode defines its own output format

Examples:
  # Using Anthropic Claude (default)
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # Using OpenAI GPT-4
  E2E_OPENAI_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # Using Google Gemini
  E2E_GOOGLE_API_KEY=... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # With multiple keys (uses first available in priority order)
  E2E_CLAUDE_API_KEY=sk-... E2E_OPENAI_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --pr 12345
`);
}

/**
 * Get ordered list of available providers
 *
 * Returns providers in priority order that have API keys configured.
 */
async function getOrderedProviders(): Promise<ILLMProvider[]> {
  const available = await getAvailableProviders();

  if (available.length === 0) {
    const envKeys = Object.values(LLM_CONFIG.providers)
      .map((p) => p.envKey)
      .join(', ');
    throw new Error(`No LLM provider available. Set one of: ${envKeys}`);
  }

  // Sort by priority order
  const priorityOrder = LLM_CONFIG.providerPriority;
  const sorted = available.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a);
    const bIndex = priorityOrder.indexOf(b);
    return aIndex - bIndex;
  });

  return sorted.map((type) => createProvider(type));
}

async function main() {
  console.log('🤖 Starting E2E AI analysis...');

  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);
  const mode = validateMode(options.mode);
  const baseBranch = options.baseBranch;
  const baseDir = process.cwd();
  const githubRepo = APP_CONFIG.githubRepo;

  console.log(`🎯 Mode: ${mode}`);

  // Get changed files
  let allChangedFiles: string[];
  if (options.changedFiles) {
    const providedFiles = options.changedFiles.split(/\s+/).filter((f) => f);
    allChangedFiles = validateProvidedFiles(providedFiles, baseBranch, baseDir);
  } else if (options.prNumber) {
    allChangedFiles = getPRFiles(options.prNumber, githubRepo);
  } else {
    allChangedFiles = getAllChangedFiles(baseBranch, baseDir);
  }
  console.log(`📁 Found ${allChangedFiles.length} modified files`);

  // Validate we have files to analyze
  if (allChangedFiles.length === 0) {
    console.log(
      '💡 Tip: Make sure you have uncommitted changes or are on a branch with commits',
    );
    const analysis = MODES[mode].createEmptyResult();
    MODES[mode].outputAnalysis(analysis);
    return;
  }

  const criticalFiles = identifyCriticalFiles(allChangedFiles);
  if (criticalFiles.length > 0) {
    console.log(`⚠️  ${criticalFiles.length} critical files detected`);
  }

  // Get available providers in priority order
  const providers = await getOrderedProviders();
  console.log(
    `✅ Available providers: ${providers.map((p) => p.displayName).join(', ')}`,
  );

  // Try each provider for the entire analysis
  // If a provider fails mid-analysis, restart with the next provider
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`\n🚀 Starting analysis with ${provider.displayName}...`);

      const analysis = await analyzeWithAgent(
        provider,
        allChangedFiles,
        criticalFiles,
        mode,
        baseDir,
        baseBranch,
      );

      // Success - output results and exit
      MODES[mode].outputAnalysis(analysis);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `\n⚠️  ${provider.displayName} failed: ${lastError.message}`,
      );

      if (providers.indexOf(provider) < providers.length - 1) {
        console.log('🔄 Retrying with next available provider...');
      }
    }
  }

  // All providers failed - use conservative fallback
  console.error('\n❌ All providers failed. Using conservative fallback.');
  if (lastError) {
    console.error(`Last error: ${lastError.message}`);
  }

  const fallbackAnalysis = MODES[mode].createConservativeResult();
  MODES[mode].outputAnalysis(fallbackAnalysis);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
