/**
 * Shared TypeScript types for AI E2E Tags Selector
 */

export interface SelectTagsAnalysis {
  selectedTags: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface ModeAnalysisTypes {
  'select-tags': SelectTagsAnalysis;
}

export interface ParsedArgs {
  baseBranch: string;
  changedFiles?: string;
  prNumber?: number;
  skill?: string;
  provider?: string;
}

export interface ToolInput {
  // read_file, get_git_diff
  file_path?: string;
  lines_limit?: number;

  // get_pr_diff
  pr_number?: number;
  files?: string[];

  // find_related_files
  search_type?: 'importers' | 'imports' | 'tests' | 'module' | 'ci' | 'all';
  max_results?: number;

  // list_directory
  directory?: string;

  // grep_codebase
  pattern?: string;
  file_pattern?: string;

  // finalize_tag_selection (select-tags mode)
  selected_tags?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  confidence?: number;
  reasoning?: string;
}

/**
 * Skills Architecture Types
 */

/**
 * Context passed to skills containing all analysis parameters
 */
export interface SkillContext {
  baseDir: string;
  baseBranch: string;
  prNumber?: number;
  githubRepo?: string;
  changedFiles: string[];
  criticalFiles: string[];
  // Skills can pass additional context to each other
  metadata?: Record<string, unknown>;
}

/**
 * Dependency declaration for skills
 */
export interface SkillDependency {
  skillName: string;
  required: boolean; // If true, fail if dependency not available
  version?: string; // Optional version constraint
}

/**
 * Metadata for skill discovery
 */
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  dependencies?: SkillDependency[];
}
