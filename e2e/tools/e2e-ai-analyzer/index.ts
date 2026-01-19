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
import {
  MODES,
  validateMode,
  analyzeWithAgent,
  AnalysisContext,
} from './analysis/analyzer';
import { identifyCriticalFiles } from './utils/file-utils';
import {
  createProvider,
  getSupportedProviders,
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
      case '--provider':
      case '-p':
        options.provider = args[++i];
        break;
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
  -p, --provider <provider>     Force specific provider (anthropic, openai, google)
  -h, --help                    Show this help message

Output:
  - each mode defines its own output format

Examples:
  # Using Anthropic Claude (default)
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # Using OpenAI GPT-4
  E2E_OPENAI_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # Using Google Gemini
  E2E_GEMINI_API_KEY=... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # With multiple keys (uses first available in priority order)
  E2E_CLAUDE_API_KEY=sk-... E2E_OPENAI_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --pr 12345

  # Force a specific provider
  E2E_OPENAI_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --provider openai --pr 12345
`);
}

/**
 * Validate provider option
 */
function validateProvider(providerInput?: string): ProviderType | undefined {
  if (!providerInput) return undefined;

  const supported = getSupportedProviders();
  if (!supported.includes(providerInput as ProviderType)) {
    console.error(
      `❌ Invalid provider: ${providerInput}. Valid providers: ${supported.join(', ')}`,
    );
    process.exit(1);
  }

  return providerInput as ProviderType;
}

/**
 * Get provider order to try
 *
 * If forcedProvider is specified, only that provider will be tried.
 * Otherwise, returns providers in priority order from config.
 * Availability is checked at runtime - missing API keys trigger fallback.
 */
function getProviderOrder(forcedProvider?: ProviderType): ProviderType[] {
  if (forcedProvider) {
    return [forcedProvider];
  }
  return LLM_CONFIG.providerPriority;
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
  const forcedProvider = validateProvider(options.provider);
  const baseBranch = options.baseBranch;
  const baseDir = process.cwd();
  const githubRepo = APP_CONFIG.githubRepo;

  console.log(`🎯 Mode: ${mode}`);
  if (forcedProvider) {
    console.log(`🔒 Provider: ${forcedProvider} (forced)`);
  }

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

  // Build analysis context
  const analysisContext: AnalysisContext = {
    baseDir,
    baseBranch,
    prNumber: options.prNumber,
    githubRepo,
  };

  if (options.prNumber) {
    console.log(`🔗 PR #${options.prNumber} - using gh CLI for diffs`);
  }

  // Get provider order (forced provider or priority from config)
  const providerOrder = getProviderOrder(forcedProvider);
  console.log(`📋 Provider failover order: ${providerOrder.join(' → ')}`);

  // Check provider availability upfront
  console.log('\n🔍 Checking provider availability...');
  const availableProviders: {
    type: ProviderType;
    provider: ReturnType<typeof createProvider>;
  }[] = [];

  for (const providerType of providerOrder) {
    const provider = createProvider(providerType);
    console.log(`   Checking ${provider.displayName}...`);

    if (await provider.isAvailable()) {
      console.log(`   ✅ ${provider.displayName} is available`);
      availableProviders.push({ type: providerType, provider });
    } else {
      console.log(`   ❌ ${provider.displayName} is not available`);
    }
  }

  if (availableProviders.length === 0) {
    console.error('\n❌ No providers available. Set one of:');
    console.error(`   ${LLM_CONFIG.providers.anthropic.envKey}`);
    console.error(`   ${LLM_CONFIG.providers.openai.envKey}`);
    console.error(`   ${LLM_CONFIG.providers.google.envKey}`);
    const fallbackAnalysis = MODES[mode].createConservativeResult();
    MODES[mode].outputAnalysis(fallbackAnalysis);
    return;
  }

  console.log(
    `\n📋 Available providers: ${availableProviders.map((p) => p.type).join(' → ')}`,
  );

  // Try each available provider in order
  let lastError: Error | null = null;

  for (let i = 0; i < availableProviders.length; i++) {
    const { type: providerType, provider } = availableProviders[i];

    try {
      console.log(`\n🚀 Using ${provider.displayName}...`);

      const analysis = await analyzeWithAgent(
        provider,
        allChangedFiles,
        criticalFiles,
        mode,
        analysisContext,
      );

      // Success - output results and exit
      MODES[mode].outputAnalysis(analysis);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`\n⚠️  ${providerType} failed: ${lastError.message}`);

      if (i < availableProviders.length - 1) {
        console.log('🔄 Falling back to next provider...');
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
