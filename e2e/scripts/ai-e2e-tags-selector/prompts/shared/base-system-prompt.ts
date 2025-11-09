/**
 * Shared System Prompt Components
 *
 * Reusable parts of the system prompt across all modes
 */

import { APP_CONFIG } from '../../config';

/**
 * Builds the shared critical patterns section
 */
export function buildCriticalPatternsSection(): string {
  return `CRITICAL FILE PATTERNS (files pre-marked as critical for you):
- Exact files: ${APP_CONFIG.critical.files.join(', ')}
- Keywords: ${APP_CONFIG.critical.keywords.join(', ')} (any file containing these)
- Paths: ${APP_CONFIG.critical.paths.join(', ')} (files in these directories)

Note: Files matching these patterns are flagged as CRITICAL in the file list you receive.
You can see WHY each file is critical and agree/disagree based on actual changes.`;
}

/**
 * Builds the shared tools section
 */
export function buildToolsSection(): string {
  return `TOOLS AVAILABLE:
- read_file: Read actual file content
- get_git_diff: See exact code changes for specific files
- find_related_files: Discover impact depth and relationships
  * For CI files: finds reusable workflow callers, GitHub Action usage, script usage in workflows
  * For code files: finds importers (dependents), dependencies, tests, module files
  * Use search_type='ci' for workflow/action/script relationships
  * Use search_type='importers' to find who depends on code changes
  * Use search_type='all' for comprehensive relationship analysis
- list_directory: List files in a directory to understand module structure
- grep_codebase: Search for patterns to find usage or references across codebase
- finalize_decision: Submit your decision`;
}

/**
 * Builds the shared reasoning approach section
 */
export function buildReasoningSection(): string {
  return `REASONING APPROACH:
You have extended thinking enabled (10,000 tokens). Use it to:
- Think deeply about change impacts
- Consider direct and indirect effects
- Reason about risk levels
- Evaluate change significance`;
}

