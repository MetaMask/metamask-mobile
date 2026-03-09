/**
 * Shared TypeScript types for AI E2E Tags Selector
 */

export interface PerformanceTestSelection {
  selectedTags: string[];
  reasoning: string;
}

export interface SkillMetadata {
  name: string;
  description: string;
  tools?: string;
}

export interface Skill {
  name: string;
  metadata: SkillMetadata;
  content: string;
}

export interface SelectTagsAnalysis {
  selectedTags: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  performanceTests: PerformanceTestSelection;
}

export interface ModeAnalysisTypes {
  'select-tags': SelectTagsAnalysis;
}

/**
 * Configuration interface for an analysis mode.
 *
 * To add a new mode:
 * 1. Define its result type and add it to ModeAnalysisTypes
 * 2. Implement all required fields below
 * 3. Register it in the MODES object in analyzer.ts
 */
export interface ModeConfig<T = unknown> {
  description: string;
  finalizeToolName: string;
  systemPromptBuilder: (availableSkills: SkillMetadata[]) => string;
  taskPromptBuilder: (allFiles: string[], criticalFiles: string[]) => string;
  processAnalysis: (aiResponse: string, baseDir: string) => Promise<T | null>;
  createConservativeResult: () => T;
  createEmptyResult: () => T;
  outputAnalysis: (analysis: T) => void;
  /** Optional deterministic rules that bypass AI and force a result. */
  checkHardRules?: (
    changedFiles: string[],
    context: AnalysisContext,
  ) => T | null;
}

/**
 * Analysis context containing all parameters needed for the analysis
 */
export interface AnalysisContext {
  baseDir: string;
  baseBranch: string;
  prNumber?: number;
  githubRepo?: string;
}

/**
 * A hard rule that overrides AI analysis and forces all tests to run.
 * If `check` returns a non-null string, it becomes the reason for running all tests.
 */
export interface HardRule {
  name: string;
  description: string;
  check: (changedFiles: string[], context: AnalysisContext) => string | null;
}

export interface ParsedArgs {
  baseBranch: string;
  changedFiles?: string;
  prNumber?: number;
  mode?: string;
  provider?: string;
  listSkills?: boolean;
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

  // load_skill
  skill_name?: string;

  // finalize_tag_selection (select-tags mode)
  selected_tags?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  confidence?: number;
  reasoning?: string;
  performance_tests?: {
    selected_tags: string[];
    reasoning: string;
  };
}
