/**
 * Shared TypeScript types for AI E2E Tags Selector
 */

export interface PerformanceTestSelection {
  shouldRun: boolean;
  selectedTags: string[];
  reasoning: string;
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

export interface ParsedArgs {
  baseBranch: string;
  changedFiles?: string;
  prNumber?: number;
  mode?: string;
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
  performance_tests?: {
    should_run: boolean;
    selected_tags: string[];
    reasoning: string;
  };
}
