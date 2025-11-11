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

export interface TagTestInfo {
  tag: string;
  testFiles: string[];
  fileCount: number;
  recommendedSplits: number;
}

export interface ParsedArgs {
  baseBranch: string;
  changedFiles?: string;
  prNumber?: number;
  mode?: string;
}

export interface ToolInput {
  file_path?: string;
  lines_limit?: number;
  pr_number?: number;
  files?: string[];
  search_type?: 'importers' | 'imports' | 'tests' | 'module' | 'ci' | 'all';
  max_results?: number;
  selected_tags?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  confidence?: number;
  reasoning?: string;
  areas?: string[];
}

export interface TagConfig {
  name: string;
  pattern: string;
  description?: string;
}

export interface FilePattern {
  name: string;
  patterns: string[] | ((file: string) => boolean);
  description?: string;
}
