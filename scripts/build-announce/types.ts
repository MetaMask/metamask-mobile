/**
 * Type definitions for RC Build Announce
 *
 * Defines interfaces for build information, test plan data, and comment context.
 */

/**
 * An automated release-candidate OTA delivery: no new binaries were produced, the change was
 * published to the `rc` channel on top of an existing native build.
 *
 * Env var names are shared with scripts/slack-rc-notification.mjs (OTA_COMMIT_SHORT_SHA,
 * OTA_NATIVE_BUILD_NUMBER, OTA_BASELINE_SHORT_SHA) so the PR comment and the Slack message
 * cannot describe the same delivery differently.
 */
export interface OtaUpdateInfo {
  /** Commit the update was published from. The only stable identifier for the delivery. */
  commitShortSha: string;
  /** Build number of the native build the update runs on top of. */
  nativeBuildNumber: string;
  /** Commit that native build was made from. */
  baselineShortSha: string;
}

/**
 * Build information from the CI pipeline
 */
export interface BuildInfo {
  semver: string;
  iosBuildNumber: string;
  androidBuildNumber: string;
  pipelineUrl?: string;
  androidPublicUrl?: string;
  /** Set only for OTA-only RC deliveries, where there is nothing new to install. */
  otaUpdate?: OtaUpdateInfo;
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

