/**
 * E2E AI Analyzer - Entry Point
 *
 * AI-powered E2E test analysis with multiple operation modes
 */

import Anthropic from '@anthropic-ai/sdk';
import { ParsedArgs, FileCategorization } from './types';
import { APP_CONFIG } from './config';
import {
  getAllChangedFiles,
  getPRFiles,
  validatePRNumber,
} from './utils/git-utils';
import { createLogger } from './utils/output-formatter';
import { MODES, validateMode, analyzeWithAgent } from './analysis/analyzer';

/**
 * Validates provided files against actual git changes
 */
function validateProvidedFiles(
  providedFiles: string[],
  baseBranch: string,
  baseDir: string,
  log: (msg: string) => void,
): string[] {
  log('🔍 Validating provided files have changes...');
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

  log(`✅ All ${providedFiles.length} provided files validated`);
  return providedFiles;
}

/**
 * Identifies critical files from the list of changed files
 */
function identifyCriticalFiles(files: string[]): string[] {
  const { files: criticalFileNames, keywords, paths } = APP_CONFIG.critical;

  return files.filter((file) => {
    // Check exact file names
    if (criticalFileNames.includes(file)) {
      return true;
    }
    // Check keywords
    for (const keyword of keywords) {
      if (file.includes(keyword)) {
        return true;
      }
    }
    // Check critical paths
    for (const path of paths) {
      if (file.includes(path)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Parses command line arguments
 */
function parseArgs(args: string[]): ParsedArgs {
  const options: ParsedArgs = {
    baseBranch: APP_CONFIG.defaultBaseBranch,
    output: 'console',
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

  console.log(`
Smart E2E AI Analyzer

AVAILABLE MODES:
${modeList}

AI AGENTIC FLOW:
1. AI gets list of changed files
2. AI calls tools to investigate (get_git_diff, find_related_files, etc.)
3. AI thinks deeply about impacts and provides a decision

Usage: node -r esbuild-register e2e/tools/e2e-ai-analyzer [options]

Options:
  -m, --mode <mode>             Analysis mode (default: select-tags)
  -b, --base-branch <branch>    Base branch for comparison (default: origin/main)
  -o, --output <mode>           Output mode: console|json (default: console)
  --changed-files <files>       Provide changed files directly
  --pr <number>                 Get changed files from a specific PR
  -h, --help                    Show this help message

Examples:
  # Analyze current branch (default: select-tags mode)
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer

  # Specific mode
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --mode select-tags

  # Analyze PR (requires gh CLI authenticated)
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --pr 12345

  # JSON output for CI/CD
  E2E_CLAUDE_API_KEY=sk-... node -r esbuild-register e2e/tools/e2e-ai-analyzer --output json
    `);
}

async function main() {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('❌ E2E_CLAUDE_API_KEY not set');
    process.exit(1);
  }

  const anthropic = new Anthropic({
    apiKey,
  });

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
  const isQuietMode = options.output === 'json';
  const log = createLogger(isQuietMode);

  log(`🎯 Mode: ${mode}`);

  // Get changed files
  let allChangedFiles: string[];
  if (options.changedFiles) {
    const providedFiles = options.changedFiles.split(/\s+/).filter((f) => f);
    allChangedFiles = validateProvidedFiles(
      providedFiles,
      baseBranch,
      baseDir,
      log,
    );
  } else if (options.prNumber) {
    allChangedFiles = getPRFiles(options.prNumber, githubRepo);
  } else {
    allChangedFiles = getAllChangedFiles(baseBranch, baseDir);
  }
  log(`📁 Found ${allChangedFiles.length} modified files`);

  // Validate we have files to analyze
  if (allChangedFiles.length === 0) {
    log(
      '💡 Tip: Make sure you have uncommitted changes or are on a branch with commits',
    );

    const analysis = MODES[mode].createEmptyResult();
    MODES[mode].outputAnalysis(analysis, options.output);
    return;
  }

  const criticalFiles = identifyCriticalFiles(allChangedFiles);
  if (criticalFiles.length > 0) {
    log(`⚠️  ${criticalFiles.length} critical files detected`);
  }

  const categorization: FileCategorization = {
    allFiles: allChangedFiles,
    criticalFiles,
  };

  // Run AI analysis
  const analysis = await analyzeWithAgent(
    anthropic,
    categorization,
    mode,
    baseDir,
    baseBranch,
    isQuietMode,
    log,
  );

  // Output results
  MODES[mode].outputAnalysis(analysis, options.output);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
