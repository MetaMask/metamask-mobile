/**
 * System Configuration
 * Central configuration for AI agent behavior and API settings
 *
 */

import { ProviderType, ProviderConfig } from './providers/types';

/**
 * Multi-Provider LLM Configuration
 *
 * Supports automatic fallback between providers when one is unavailable.
 */
export const LLM_CONFIG = {
  /**
   * Provider priority order for automatic fallback
   * The first available provider in this list will be used
   */
  providerPriority: ['google', 'anthropic', 'openai'] as ProviderType[],

  /**
   * Per-provider configuration
   */
  providers: {
    anthropic: {
      model: 'claude-opus-4-5-20251101',
      envKey: 'E2E_CLAUDE_API_KEY',
    } as ProviderConfig,
    openai: {
      model: 'gpt-4o',
      envKey: 'E2E_OPENAI_API_KEY',
    } as ProviderConfig,
    google: {
      model: 'gemini-1.5-pro',
      envKey: 'E2E_GEMINI_API_KEY',
    } as ProviderConfig,
  },

  /**
   * Shared settings across all providers
   */

  /**
   * Temperature controls randomness in responses (0-1)
   * - 0 = deterministic, consistent outputs for same inputs
   * - 1 = more creative/varied responses
   * Using 0 for consistent tag selection across runs
   */
  temperature: 0,

  /**
   * Maximum tokens allowed for the AI response
   * Controls the length of reasoning and tool calls
   */
  maxTokens: 16000,

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
   * - Iteration 3: AI calls finalize tool (e.g., finalize_tag_selection) → DONE
   */
  maxIterations: 20,
};

/**
 * @deprecated Use LLM_CONFIG instead. Kept for backward compatibility.
 *
 * Anthropic Claude API Configuration
 */
export const CLAUDE_CONFIG = {
  model: LLM_CONFIG.providers.anthropic.model,
  temperature: LLM_CONFIG.temperature,
  maxTokens: LLM_CONFIG.maxTokens,
  maxIterations: LLM_CONFIG.maxIterations,
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
    paths: ['app/core/', 'e2e/framework/', 'e2e/api-mocking/', 'e2e/fixtures/'],
  },
};
