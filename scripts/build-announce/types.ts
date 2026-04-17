/**
 * Type definitions for RC Build Announce
 *
 * Defines interfaces for build information, test plan data, and comment context.
 */

/**
 * Build information from the CI pipeline
 */
export interface BuildInfo {
  semver: string;
  iosBuildNumber: string;
  androidBuildNumber: string;
  pipelineUrl?: string;
  androidPublicUrl?: string;
}

/**
 * Executive summary from the AI test plan
 */
export interface ExecutiveSummary {
  releaseFocus: string;
  keyChanges: string[];
  criticalAreas: string[];
  overallRisk: 'low' | 'medium' | 'high';
  recommendation: string;
}

/**
 * Test scenario from the AI analysis
 */
export interface TestScenario {
  area: string;
  riskLevel: 'high' | 'medium' | 'low';
  preconditions?: string[];
  testSteps: string[];
  expectedOutcomes?: string[];
  whyThisMatters: string;
}

/**
 * Summary statistics for the test plan
 */
export interface TestPlanSummary {
  totalFiles: number;
  highImpactFiles: number;
  totalAdditions?: number;
  totalDeletions?: number;
  highRiskCount: number;
  mediumRiskCount: number;
  releaseRiskScore: string;
}

/**
 * Team sign-off status
 */
export interface SignOffs {
  signedOff: string[];
  needsAttention: string[];
}

/**
 * Complete test plan result from e2e-ai-analyzer
 */
export interface TestPlanResult {
  prNumber: number;
  prTitle: string;
  version?: string;
  buildNumber?: number;
  generatedAt: string;
  model: string;
  executiveSummary?: ExecutiveSummary;
  summary: TestPlanSummary;
  scenarios: TestScenario[];
  signOffs: SignOffs;
  excludedFeatures?: string[];
}

