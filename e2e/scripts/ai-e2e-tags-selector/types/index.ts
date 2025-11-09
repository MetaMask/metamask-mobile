/**
 * Shared TypeScript types for AI E2E Tags Selector
 */

export interface AIAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  selectedTags: string[];
  areas: string[];
  reasoning: string;
  confidence: number;
  testFileInfo?: TagTestInfo[];
  totalSplits?: number;
}

export interface TagTestInfo {
  tag: string;
  testFiles: string[];
  fileCount: number;
  recommendedSplits: number;
}

export interface ParsedArgs {
  baseBranch: string;
  output: 'console' | 'json';
  changedFiles?: string;
  prNumber?: number;
}

export interface FileCategorization {
  allFiles: string[];
  criticalFiles: string[];
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
