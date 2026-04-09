/**
 * Shared TypeScript types for AI E2E Tags Selector
 */

export interface PerformanceTestSelection {
  selectedTags: string[];
  reasoning: string;
}

/**
 * Risk level for test areas in test plan generation
 */
export type TestAreaRisk = 'critical' | 'high' | 'medium' | 'low';

/**
 * Platform-specific notes for iOS and Android
 */
export interface PlatformNotes {
  ios: string[];
  android: string[];
  shared: string[];
}

/**
 * Individual exploratory test scenario
 */
export interface ExploratoryTestScenario {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  explorationGuidance: string[];
  riskIndicators: string[];
  relatedChanges: string[];
}

/**
 * Exploration charter - a specific mission for exploratory testing
 */
export interface ExplorationCharter {
  id: string;
  mission: string;
  context: string;
  whatIfs: string[];
  timeBox?: string; // e.g., "30 minutes"
}

/**
 * Cross-cutting exploration theme that applies across all features
 */
export interface ExplorationTheme {
  name: string;
  description: string;
  techniques: string[];
  applicableAreas: string[]; // Feature areas where this theme is especially relevant
}

/**
 * Testing status for a feature area
 */
export interface TestingStatus {
  tested: boolean;
  testedBy: string[]; // e.g., ["team-trade", "@jane.doe"]
  testedDate?: string;
}

/**
 * Cherry-pick info for build comparison
 */
export interface CherryPickSummary {
  commit: string;
  message: string;
  prNumber: string | null;
  author: string;
  date: string;
  featureArea?: string;
}

/**
 * Build change info for a feature area
 */
export interface BuildChangeInfo {
  isNewInBuild: boolean;
  buildNumber?: number;
  relatedPRs?: string[]; // e.g., ["#25800", "#25801"]
  changeType?: 'cherry-pick' | 'fix' | 'feature';
  cherryPicks?: CherryPickSummary[];
}

/**
 * Feature area with risk assessment and test scenarios
 */
export interface FeatureAreaTestPlan {
  featureArea: string;
  displayName: string;
  riskLevel: TestAreaRisk;
  riskJustification: string;
  impactedComponents: string[];
  exploratoryScenarios: ExploratoryTestScenario[];
  platformNotes: PlatformNotes;
  priority: number;
  testingStatus: TestingStatus;
  buildChangeInfo: BuildChangeInfo;
  /** Exploratory testing priority score (1-10) based on complexity, newness, integration risk */
  exploratoryPriority: number;
  /** Specific exploration missions for this feature area */
  explorationCharters: ExplorationCharter[];
}

/**
 * Summary statistics for the test plan
 */
export interface TestPlanSummary {
  totalChangedFiles: number;
  totalCommits: number;
  criticalAreas: number;
  highRiskAreas: number;
  mediumRiskAreas: number;
  lowRiskAreas: number;
  estimatedTestingHours: string;
  releaseVersion: string;
  buildNumber?: number;
  previousBuildNumber?: number;
  /** Commit SHA for current build (when using --to-commit) */
  toCommit?: string;
  /** Commit SHA for previous build (when using --from-commit) */
  fromCommit?: string;
  areasTestedCount: number;
  areasNotTestedCount: number;
  newInThisBuildCount: number;
}

/**
 * Top exploratory focus area summary
 */
export interface ExploratoryFocusArea {
  featureArea: string;
  displayName: string;
  exploratoryPriority: number;
  reason: string;
  suggestedTimeBox: string;
}

/**
 * Complete test plan analysis result
 */
export interface GenerateTestPlanAnalysis {
  summary: TestPlanSummary;
  featureAreas: FeatureAreaTestPlan[];
  crossCuttingConcerns: string[];
  regressionFocusAreas: string[];
  platformSpecificGuidance: PlatformNotes;
  /** Cross-cutting exploration themes that apply across all features */
  explorationThemes: ExplorationTheme[];
  /** Top 3-5 areas most deserving of creative exploratory testing */
  exploratoryFocusAreas: ExploratoryFocusArea[];
  /** Cherry-picks between builds (when --build and --prev-build provided) */
  cherryPicks: CherryPickSummary[];
  reasoning: string;
  confidence: number;
  generatedAt: string;
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
  'generate-test-plan': GenerateTestPlanAnalysis;
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
  taskPromptBuilder: (
    allFiles: string[],
    criticalFiles: string[],
    context: AnalysisContext,
  ) => string;
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
  /** Current build number */
  buildNumber?: number;
  /** Previous build number to compare against */
  prevBuildNumber?: number;
  /** Start commit for cherry-pick range (alternative to prevBuildNumber) */
  fromCommit?: string;
  /** End commit for cherry-pick range (alternative to buildNumber) */
  toCommit?: string;
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
  /** Current build number to analyze */
  buildNumber?: number;
  /** Previous build number to compare against */
  prevBuildNumber?: number;
  /** Release version (e.g., "7.65.0") */
  releaseVersion?: string;
  /** Start commit for cherry-pick range (alternative to prevBuildNumber) */
  fromCommit?: string;
  /** End commit for cherry-pick range (alternative to buildNumber) */
  toCommit?: string;
  /** Initial build commit SHA (first build of RC) for delta comparison */
  initialCommit?: string;
  /** Initial build number (first build of RC) for delta comparison */
  initialBuildNumber?: number;
  /** Features to exclude from analysis (behind feature flags, not releasing) */
  excludedFeatures?: string[];
  /** Automatically fetch feature flags from remote API */
  autoFF?: boolean;
  /** Show feature flag status without running analysis */
  showFFStatus?: boolean;
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

  // finalize_test_plan_generation (generate-test-plan mode)
  summary?: {
    total_changed_files: number;
    total_commits: number;
    critical_areas: number;
    high_risk_areas: number;
    medium_risk_areas: number;
    low_risk_areas: number;
    estimated_testing_hours: string;
    release_version: string;
  };
  feature_areas?: {
    feature_area: string;
    risk_level: TestAreaRisk;
    risk_justification: string;
    impacted_components: string[];
    exploratory_scenarios: {
      id: string;
      title: string;
      description: string;
      preconditions: string[];
      exploration_guidance: string[];
      risk_indicators: string[];
      related_changes: string[];
    }[];
    platform_notes: {
      ios: string[];
      android: string[];
      shared: string[];
    };
    priority: number;
    exploratory_priority?: number;
    exploration_charters?: {
      id: string;
      mission: string;
      context: string;
      what_ifs: string[];
      time_box?: string;
    }[];
  }[];
  cross_cutting_concerns?: string[];
  regression_focus_areas?: string[];
  platform_specific_guidance?: {
    ios: string[];
    android: string[];
    shared: string[];
  };
  exploration_themes?: {
    name: string;
    description: string;
    techniques: string[];
    applicable_areas: string[];
  }[];
  exploratory_focus_areas?: {
    feature_area: string;
    exploratory_priority: number;
    reason: string;
    suggested_time_box: string;
  }[];
}
