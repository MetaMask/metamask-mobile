/**
 * System Configuration
 * Central configuration for AI agent behavior and API settings
 *
*/

/**
 * Anthropic Claude API Configuration
 */
export const CLAUDE_CONFIG = {
  /**
   * Claude model to use for analysis
   * - See available models: https://docs.anthropic.com/en/docs/about-claude/models
   */
  model: 'claude-sonnet-4-5-20250929' as const,

  /**
   * Maximum tokens allowed for the AI response. Controls the length of reasoning and tool calls
   * Docs: https://docs.anthropic.com/en/api/messages
   */
  maxTokens: 16000,

  /**
   * Extended thinking budget (tokens). AI uses this for deep reasoning before responding.
   * Higher = more thorough analysis but slower/costlier
   * Docs: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
   */
  thinkingBudgetTokens: 10000,

  /**
   * Maximum agentic iterations to prevent infinite loops
   *
   * Each iteration is a full round trip:
   * 1. AI thinks about the problem
   * 2. AI can call multiple tools (get_git_diff, find_related_files, etc.)
   * 3. Tools execute and return results
   * 4. Results sent back to AI → next iteration
   *
   * Typical flow example:
   * - Iteration 1: AI examines critical files (3-5 tool calls)
   * - Iteration 2: AI investigates dependencies (2-3 tool calls)
   * - Iteration 3: AI calls finalize_decision → DONE
   */
  maxIterations: 12,
};


/**
 * AI Tool-specific limits
 * Tool Use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const TOOL_LIMITS = {
  /**
   * Maximum lines to read when using read_file tool
   * Prevents excessive token usage on large files
   */
  readFileMaxLines: 2000,

  /**
   * Maximum diff lines when using get_git_diff tool
   * Typical diffs are < 100 lines
   */
  gitDiffMaxLines: 1000,

  /**
   * Maximum results for find_related_files tool
   * Prevents overwhelming the AI with too many files
   */
  relatedFilesMaxResults: 20,

  /**
   * Maximum results for grep_codebase tool
   * Typical searches return 10-50 matches
   */
  grepMaxResults: 50,
} as const;

/**
 * Application (System under test) Configuration
 */
export const APP_CONFIG = {
  /**
   * GitHub repository for context analysis
   * Format: 'owner/repo'
   */
  githubRepo: 'metamask/metamask-mobile',

  /**
   * Default base branch for git comparisons
   */
  defaultBaseBranch: 'origin/main',

  /**
   * Critical file detection - files that require comprehensive analysis
   *
   * Three ways to define critical files:
   * 1. Exact file names (e.g., 'package.json')
   * 2. Keywords anywhere in path (e.g., 'Controller' matches 'WalletController.ts')
   * 3. Path segments (e.g., 'app/core/' matches anything in that directory)
   */
  critical: {
    /** Exact file names that are critical (checked with file.includes(file)) */
    files: ['package.json'],

    /** Keywords that indicate critical files (checked with file.includes(keyword)) */
    keywords: ['Controller', 'Engine'],

    /** Path segments that indicate critical areas (checked with file.includes(path)) */
    paths: ['app/core/'],
  },
};

/**
 * Operation Modes
 *
 * Different analysis modes for various use cases.
 * Each mode uses the same tools but different prompts and logic.
 *
 * Note: Prompt builders are registered in selector.ts (MODE_PROMPTS) to avoid circular dependencies
 */
export const MODES = {
  /**
   * E2E Tag Selection Mode (Current - CI/CD)
   * Analyzes code changes and selects appropriate E2E smoke test tags to run
   */
  'select-tags': {
    name: 'E2E Tag Selection',
    description: 'Analyze code changes and select E2E test tags to run',
    defaultMode: true,
  },

  // Future modes (commented - ready for implementation):
  // 'suggest-migration': {
  //   name: 'Test Migration Suggestions',
  //   description: 'Identify E2E tests that could be converted to unit/integration tests',
  //   defaultMode: false,
  // },
  //
  // 'analyze-coverage': {
  //   name: 'Coverage Gap Analysis',
  //   description: 'Find code paths missing E2E test coverage',
  //   defaultMode: false,
  // },
  //
  // 'detect-flaky': {
  //   name: 'Flaky Test Detection',
  //   description: 'Analyze test failures and identify flaky tests',
  //   defaultMode: false,
  // },
  //
  // 'self-healing': {
  //   name: 'Self-Healing Recommendations',
  //   description: 'Suggest test updates for UI/selector changes',
  //   defaultMode: false,
  // },
} as const;

export type ModeKey = keyof typeof MODES;
