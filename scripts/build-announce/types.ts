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
  /**
   * Auto RC OTA details, set only when this RC shipped as an OTA update on top of an existing
   * native build (no new binaries). Absent for normal native RC builds.
   */
  otaUpdate?: OtaUpdateInfo;
}

/**
 * Details of an Auto RC OTA update.
 *
 * `label` is the display-only 4th-decimal revision (e.g. `8.0.1.2`). Because the revision counter
 * restarts on every new native baseline, the label is only unambiguous when paired with the
 * native build it layers on top of, so both are always rendered together.
 */
export interface OtaUpdateInfo {
  label: string;
  nativeBuildNumber: string;
  baselineShortSha: string;
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

/**
 * Environment values extracted from build-env.json
 */
export interface EnvValidationResult {
  buildName: string;
  extractedValues: Record<string, string | undefined>;
}

