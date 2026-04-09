/**
 * E2E AI Analyzer - Entry Point
 *
 * AI-powered E2E test analysis with multiple operation modes.
 * Supports multiple LLM providers with automatic fallback.
 */

import { ParsedArgs, AnalysisContext } from './types';
import { APP_CONFIG, LLM_CONFIG } from './config';
import {
  getAllChangedFiles,
  getPRFiles,
  validatePRNumber,
  getCherryPicksBetweenCommits,
} from './utils/git-utils';
import { MODES, validateMode, analyzeWithAgent } from './analysis/analyzer';
import { identifyCriticalFiles } from './utils/file-utils';
import {
  createProvider,
  getSupportedProviders,
  ProviderType,
} from './providers';
import { getSkillsMetadata } from './utils/skill-loader';
import {
  getPullRequestInfo,
  getLatestBuildFromPRComments,
} from './utils/github-client';
import {
  analyzeWithSingleCall,
  analyzeDeltaWithLLM,
  createCombinedTestPlan,
} from './modes/generate-test-plan/fast-analyzer';
import {
  fetchFeatureFlags,
  formatFeatureFlagSummary,
} from './utils/feature-flags';

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
      case '--list-skills':
        options.listSkills = true;
        break;
      case '--build': {
        const val = parseInt(args[++i], 10);
        if (!isNaN(val)) options.buildNumber = val;
        break;
      }
      case '--prev-build': {
        const val = parseInt(args[++i], 10);
        if (!isNaN(val)) options.prevBuildNumber = val;
        break;
      }
      case '--from-commit':
        options.fromCommit = args[++i];
        break;
      case '--to-commit':
        options.toCommit = args[++i];
        break;
      case '--version':
      case '-v':
        options.releaseVersion = args[++i];
        break;
      case '--initial-commit':
        options.initialCommit = args[++i];
        break;
      case '--initial-build': {
        const val = parseInt(args[++i], 10);
        if (!isNaN(val)) options.initialBuildNumber = val;
        break;
      }
      case '--exclude-features':
      case '-ef': {
        // Comma-separated list of features to exclude
        const featuresArg = args[++i];
        if (featuresArg) {
          options.excludedFeatures = featuresArg
            .split(',')
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
        }
        break;
      }
      case '--auto-ff':
        options.autoFF = true;
        break;
      case '--show-ff':
        options.showFFStatus = true;
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

Usage: node -r esbuild-register tests/tools/e2e-ai-analyzer [options]

Options:
  -m, --mode <mode>             Analysis mode (default: select-tags)
  -b, --base-branch <branch>    Base branch for comparison (default: origin/main)
  -cf --changed-files <files>   Provide changed files directly
  -pr --pr <number>             Get changed files from a specific PR
  -p, --provider <provider>     Force specific provider (anthropic, openai, google)
  --build <number>              Current build number (e.g., 3685)
  --prev-build <number>         Previous build number to compare against (e.g., 3682)
  --from-commit <sha>           Start commit SHA for cherry-pick range (alternative to --prev-build)
  --to-commit <sha>             End commit SHA for cherry-pick range (alternative to --build)
  --initial-commit <sha>        Initial build commit (first RC cut) for combined output
  --initial-build <number>      Initial build number (first RC cut) for combined output
  -v, --version <version>       Release version (e.g., 7.65.0) for test plan title
  -ef, --exclude-features <f>   Features with FF-gated new functionality (tests existing only)
  --auto-ff                     Auto-fetch feature flags from remote API to detect disabled features
  --show-ff                     Show current feature flag status and exit
  --list-skills                 List all available skills
  -h, --help                    Show this help message

Combined Output Mode:
  Use --initial-commit with --pr to generate a combined test plan with:
  - Cherry-pick scenarios on top (delta from initial build)
  - Initial scenarios below (from RC cut)
  This aligns with Extension team format for cross-platform consistency.

Note: Skills are loaded on-demand by the AI agent during analysis.

Output:
  - each mode defines its own output format

Examples:
  # Using Anthropic Claude (default)
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register tests/tools/e2e-ai-analyzer

  # Using OpenAI GPT-4
  E2E_OPENAI_API_KEY=sk-... node -r esbuild-register tests/tools/e2e-ai-analyzer

  # Using Google Gemini
  E2E_GEMINI_API_KEY=... node -r esbuild-register tests/tools/e2e-ai-analyzer

  # With multiple keys (uses first available in priority order)
  E2E_CLAUDE_API_KEY=sk-... E2E_OPENAI_API_KEY=sk-... node -r esbuild-register tests/tools/e2e-ai-analyzer --pr 12345

  # Force a specific provider
  E2E_OPENAI_API_KEY=sk-... node -r esbuild-register tests/tools/e2e-ai-analyzer --provider openai --pr 12345
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

  // Handle --show-ff (show feature flag status and exit)
  if (options.showFFStatus) {
    try {
      const ffSummary = fetchFeatureFlags();
      console.log('\n' + formatFeatureFlagSummary(ffSummary));
      console.log('\nDisabled flags:');
      ffSummary.disabledFlags.forEach((flag) => {
        console.log(`  • ${flag}`);
      });
    } catch (error) {
      console.error(
        '❌ Failed to fetch feature flags:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
    process.exit(0);
  }

  // Handle --list-skills
  if (options.listSkills) {
    const skillsMetadata = await getSkillsMetadata();
    console.log('\n📚 Available Skills:\n');
    if (skillsMetadata.length === 0) {
      console.log('  No skills found in skills/ directory');
    } else {
      skillsMetadata.forEach((skill) => {
        console.log(`  - ${skill.name}: ${skill.description}`);
        if (skill.tools) {
          console.log(`    Tools: ${skill.tools}`);
        }
      });
    }
    console.log(
      '\nSkills are loaded on-demand by the AI agent during analysis.\n',
    );
    process.exit(0);
  }

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
    (MODES[mode].outputAnalysis as (a: unknown) => void)(analysis);
    return;
  }

  const criticalFiles = identifyCriticalFiles(allChangedFiles);
  if (criticalFiles.length > 0) {
    console.log(`⚠️  ${criticalFiles.length} critical files detected`);
  }

  // Load skill metadata (full content loaded on-demand by agent)
  console.log('📋 Loading available skills...');
  const availableSkills = await getSkillsMetadata();
  console.log(
    `   Found ${availableSkills.length} skills available for on-demand loading\n`,
  );

  // Build analysis context
  const analysisContext: AnalysisContext = {
    baseDir,
    baseBranch,
    prNumber: options.prNumber,
    githubRepo,
    buildNumber: options.buildNumber,
    prevBuildNumber: options.prevBuildNumber,
    fromCommit: options.fromCommit,
    toCommit: options.toCommit,
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
      const envKey = LLM_CONFIG.providers[providerType].envKey;
      const hasKey = !!process.env[envKey];
      const reason = hasKey
        ? 'API call failed (see warning above)'
        : `missing ${envKey}`;
      console.log(`   ❌ ${provider.displayName} is not available — ${reason}`);
    }
  }

  if (availableProviders.length === 0) {
    console.error('\n❌ No providers available. Set one of:');
    console.error(`   ${LLM_CONFIG.providers.anthropic.envKey}`);
    console.error(`   ${LLM_CONFIG.providers.openai.envKey}`);
    console.error(`   ${LLM_CONFIG.providers.google.envKey}`);
    const fallbackAnalysis = MODES[mode].createConservativeResult();
    (MODES[mode].outputAnalysis as (a: unknown) => void)(fallbackAnalysis);
    return;
  }

  console.log(
    `\n📋 Available providers: ${availableProviders.map((p) => p.type).join(' → ')}`,
  );

  // Auto-fetch feature flags if requested
  const excludedFeatures = options.excludedFeatures || [];
  if (options.autoFF) {
    console.log('\n🔍 Auto-detecting disabled feature flags...');
    const ffSummary = fetchFeatureFlags();

    // Get ALL disabled flags (these are specific features that are OFF)
    const disabledFlags = ffSummary.disabledFlags;

    if (disabledFlags.length > 0) {
      console.log(`   Found ${disabledFlags.length} disabled flags`);

      // Show disabled flags grouped by area
      for (const [area, flags] of ffSummary.disabledByArea.entries()) {
        console.log(`   ${area}: ${flags.length} disabled`);
        flags.slice(0, 3).forEach((f) => console.log(`     - ${f}`));
        if (flags.length > 3) {
          console.log(`     ... and ${flags.length - 3} more`);
        }
      }

      // Merge disabled flag names with manual excludes
      const manualSet = new Set(excludedFeatures);
      for (const flag of disabledFlags) {
        if (!manualSet.has(flag)) {
          excludedFeatures.push(flag);
        }
      }
    } else {
      console.log('   No disabled flags found');
    }
  }

  // Update options with merged excludes
  options.excludedFeatures = excludedFeatures;

  // FAST PATH: generate-test-plan mode with PR number
  if (mode === 'generate-test-plan' && options.prNumber) {
    // COMBINED MODE: initial-commit provided - generate combined output
    if (options.initialCommit) {
      console.log(
        `\n📦 Combined mode: generating full test plan with cherry-picks from initial build`,
      );
      console.log(`   Initial commit: ${options.initialCommit}`);

      const prInfo = getPullRequestInfo(options.prNumber, githubRepo);
      const version =
        options.releaseVersion ||
        prInfo.title.match(/\d+\.\d+\.\d+/)?.[0] ||
        'unknown';

      // Get latest build number
      const latestBuild = getLatestBuildFromPRComments(
        options.prNumber,
        githubRepo,
      );
      if (latestBuild) {
        console.log(`   Current build: ${latestBuild}`);
      }

      // Get current HEAD commit
      const { execSync } = await import('child_process');
      const currentCommit = execSync('git rev-parse HEAD', {
        encoding: 'utf-8',
        cwd: baseDir,
      }).trim();
      console.log(`   Current commit: ${currentCommit.substring(0, 7)}`);

      // Get cherry-picks between initial and current
      const cherryPicks = getCherryPicksBetweenCommits(
        options.initialCommit,
        currentCommit,
        baseDir,
      );
      console.log(`   Cherry-picks since initial: ${cherryPicks.length}`);

      // Try providers
      for (let i = 0; i < availableProviders.length; i++) {
        const { type: providerType, provider } = availableProviders[i];

        try {
          console.log(`\n🚀 Using ${provider.displayName}...`);

          // Step 1: Generate initial analysis
          console.log(`\n📋 Step 1: Generating initial scenarios...`);
          const initialResult = await analyzeWithSingleCall(
            provider,
            prInfo,
            latestBuild,
            options.excludedFeatures || [],
            version,
          );

          // Step 2: Generate delta analysis (if there are cherry-picks)
          let deltaResult;
          if (cherryPicks.length > 0) {
            console.log(`\n🍒 Step 2: Generating cherry-pick scenarios...`);
            deltaResult = await analyzeDeltaWithLLM(
              provider,
              cherryPicks,
              prInfo.teamSignOffs,
              options.prNumber,
              options.initialCommit,
              currentCommit,
              version,
              baseDir,
              options.initialBuildNumber,
              latestBuild,
            );
          } else {
            console.log(`\n✅ No cherry-picks since initial build`);
          }

          // Step 3: Combine results
          console.log(`\n🔗 Step 3: Combining results...`);
          const combinedResult = createCombinedTestPlan(
            initialResult,
            deltaResult,
          );

          // Print summary
          console.log(`\n✅ Test plan generated:`);
          console.log(
            `   Risk score: ${combinedResult.summary.releaseRiskScore}`,
          );
          console.log(
            `   High risk scenarios: ${combinedResult.summary.highRiskScenarios}`,
          );
          console.log(
            `   Medium risk scenarios: ${combinedResult.summary.mediumRiskScenarios}`,
          );
          if (combinedResult.summary.cherryPickCount) {
            console.log(
              `   Cherry-picks: ${combinedResult.summary.cherryPickCount}`,
            );
          }

          // Write JSON file
          const fs = await import('fs');
          fs.writeFileSync(
            'release-test-plan.json',
            JSON.stringify(combinedResult, null, 2),
          );
          console.log('\n💾 Saved to release-test-plan.json');
          return;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn(`\n⚠️  ${providerType} failed: ${err.message}`);

          if (i < availableProviders.length - 1) {
            console.log('🔄 Falling back to next provider...');
          }
        }
      }

      console.error('\n❌ All providers failed for combined analysis.');
      process.exit(1);
    }

    // Check if this is delta mode (comparing builds)
    if (options.fromCommit && options.toCommit) {
      console.log(
        `\n🍒 Delta mode: comparing ${options.fromCommit} → ${options.toCommit}`,
      );

      // Get PR info for sign-offs
      const prInfo = getPullRequestInfo(options.prNumber, githubRepo);

      // Get cherry-picks between commits
      const cherryPicks = getCherryPicksBetweenCommits(
        options.fromCommit,
        options.toCommit,
        baseDir,
      );

      const version =
        options.releaseVersion ||
        prInfo.title.match(/\d+\.\d+\.\d+/)?.[0] ||
        'unknown';

      // Get build number from PR comments
      console.log(`   Fetching build number from PR comments...`);
      const latestBuild = getLatestBuildFromPRComments(
        options.prNumber,
        githubRepo,
      );
      if (latestBuild) {
        console.log(`   ✓ Latest build: ${latestBuild}`);
      }

      if (cherryPicks.length === 0) {
        console.log('\n✅ No cherry-picks detected between these commits.');
        console.log('No delta analysis needed.');
        return;
      }

      console.log(`   Found ${cherryPicks.length} cherry-pick(s)`);

      // Use LLM to generate test scenarios for cherry-picks
      for (let i = 0; i < availableProviders.length; i++) {
        const { type: providerType, provider } = availableProviders[i];

        try {
          const deltaResult = await analyzeDeltaWithLLM(
            provider,
            cherryPicks,
            prInfo.teamSignOffs,
            options.prNumber,
            options.fromCommit,
            options.toCommit,
            version,
            baseDir,
            options.prevBuildNumber,
            options.buildNumber || latestBuild,
          );

          // Print summary
          console.log(`\n✅ Delta analysis complete:`);
          console.log(
            `   Cherry-picks analyzed: ${deltaResult.cherryPicks.length}`,
          );
          console.log(
            `   Scenarios generated: ${deltaResult.scenarios.length}`,
          );

          // Write JSON file
          const fs = await import('fs');
          fs.writeFileSync(
            'release-delta.json',
            JSON.stringify(deltaResult, null, 2),
          );
          console.log('\n💾 Saved to release-delta.json');
          return;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn(`\n⚠️  ${providerType} failed: ${err.message}`);

          if (i < availableProviders.length - 1) {
            console.log('🔄 Falling back to next provider...');
          }
        }
      }

      console.error('\n❌ All providers failed for delta analysis.');
      process.exit(1);
    }

    // Fast path: single LLM call for test plan generation
    console.log(`\n⚡ Fast mode: single LLM call for test plan generation`);

    const prInfo = getPullRequestInfo(options.prNumber, githubRepo);

    // Fetch build number from PR comments
    const buildNumber = getLatestBuildFromPRComments(
      options.prNumber,
      githubRepo,
    );
    if (buildNumber) {
      console.log(`   ✓ Latest build: ${buildNumber}`);
    }

    // Try each provider
    for (let i = 0; i < availableProviders.length; i++) {
      const { type: providerType, provider } = availableProviders[i];

      try {
        console.log(`\n🚀 Using ${provider.displayName}...`);

        const result = await analyzeWithSingleCall(
          provider,
          prInfo,
          buildNumber,
          options.excludedFeatures || [],
          options.releaseVersion,
        );

        // Print summary
        console.log(`\n✅ Test plan generated:`);
        console.log(`   Risk score: ${result.summary.releaseRiskScore}`);
        console.log(`   High risk scenarios: ${result.summary.highRiskCount}`);
        console.log(
          `   Medium risk scenarios: ${result.summary.mediumRiskCount}`,
        );

        // Write JSON file
        const fs = await import('fs');
        fs.writeFileSync(
          'release-test-plan.json',
          JSON.stringify(result, null, 2),
        );
        console.log('\n💾 Saved to release-test-plan.json');
        return;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn(`\n⚠️  ${providerType} failed: ${err.message}`);

        if (i < availableProviders.length - 1) {
          console.log('🔄 Falling back to next provider...');
        }
      }
    }

    console.error('\n❌ All providers failed for fast analysis.');
    process.exit(1);
  }

  // LEGACY PATH: agentic loop for other modes
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
        availableSkills,
      );

      // Success - output results and exit
      (MODES[mode].outputAnalysis as (a: unknown) => void)(analysis);
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
  (MODES[mode].outputAnalysis as (a: unknown) => void)(fallbackAnalysis);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
