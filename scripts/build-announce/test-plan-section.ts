/**
 * Test Plan Section Builder
 *
 * Converts AI-generated test plan JSON to formatted markdown
 * with collapsible sections for PR comments.
 */

import type { TestPlanResult, TestScenario, ExecutiveSummary } from './types';

/**
 * Formats a single scenario as markdown
 */
function formatScenarioMarkdown(scenario: TestScenario, index: number): string {
  let md = `### ${index}. ${scenario.area}\n`;
  md += `**Risk Level:** ${scenario.riskLevel.toUpperCase()}\n\n`;

  if (scenario.whyThisMatters) {
    md += `**Why This Matters:** ${scenario.whyThisMatters}\n\n`;
  }

  if (scenario.preconditions && scenario.preconditions.length > 0) {
    md += `**Preconditions:**\n`;
    scenario.preconditions.forEach((precondition) => {
      md += `- ${precondition}\n`;
    });
    md += '\n';
  }

  md += `**Test Steps:**\n`;
  scenario.testSteps.forEach((step, i) => {
    // Handle steps that may already be numbered
    const stepText = step.replace(/^\d+\.\s*/, '');
    md += `${i + 1}. ${stepText}\n`;
  });

  if (scenario.expectedOutcomes && scenario.expectedOutcomes.length > 0) {
    md += `\n**Expected Outcomes:**\n`;
    scenario.expectedOutcomes.forEach((outcome) => {
      md += `- ${outcome}\n`;
    });
  }

  md += '\n---\n\n';
  return md;
}

/**
 * Formats scenarios by risk level into markdown
 */
function formatScenariosByRisk(scenarios: TestScenario[]): string {
  const highRisk = scenarios.filter((s) => s.riskLevel === 'high');
  const mediumRisk = scenarios.filter((s) => s.riskLevel === 'medium');

  let md = '';

  if (highRisk.length > 0) {
    md += `## High Risk Scenarios (${highRisk.length})\n\n`;
    highRisk.forEach((scenario, index) => {
      md += formatScenarioMarkdown(scenario, index + 1);
    });
  }

  if (mediumRisk.length > 0) {
    md += `## Medium Risk Scenarios (${mediumRisk.length})\n\n`;
    mediumRisk.forEach((scenario, index) => {
      md += formatScenarioMarkdown(scenario, index + 1);
    });
  }

  return md;
}

/**
 * Builds the executive summary section
 */
function buildExecutiveSummarySection(summary: ExecutiveSummary): string {
  let md = `<details>\n<summary><strong>Executive Summary</strong></summary>\n\n`;

  md += `**Release Focus:** ${summary.releaseFocus}\n\n`;

  if (summary.keyChanges && summary.keyChanges.length > 0) {
    md += `**Key Changes:**\n`;
    summary.keyChanges.forEach((change) => {
      md += `- ${change}\n`;
    });
    md += '\n';
  }

  if (summary.criticalAreas && summary.criticalAreas.length > 0) {
    md += `**Critical Areas:** ${summary.criticalAreas.join(', ')}\n\n`;
  }

  md += `**Overall Risk:** ${summary.overallRisk.toUpperCase()}\n\n`;
  md += `**Recommendation:** ${summary.recommendation}\n\n`;

  md += `</details>\n\n`;
  return md;
}

/**
 * Builds the teams sign-off section
 */
function buildSignOffsSection(signOffs: { signedOff: string[]; needsAttention: string[] }): string {
  const totalTeams = signOffs.signedOff.length + signOffs.needsAttention.length;
  const signedOffCount = signOffs.signedOff.length;

  let md = `<details>\n<summary><strong>Teams Sign-off Status (${signedOffCount}/${totalTeams})</strong></summary>\n\n`;

  if (signOffs.signedOff.length > 0) {
    md += `**Signed off:** ${signOffs.signedOff.join(', ')}\n\n`;
  }

  if (signOffs.needsAttention.length > 0) {
    md += `**Awaiting sign-off (${signOffs.needsAttention.length}):** ${signOffs.needsAttention.join(', ')}\n\n`;
  }

  md += `</details>\n\n`;
  return md;
}

/**
 * Builds the excluded features (feature flags) section
 */
function buildExcludedFeaturesSection(features: string[]): string {
  if (!features || features.length === 0) {
    return '';
  }

  let md = `<details>\n<summary><strong>Excluded Features - Feature Flags Disabled (${features.length})</strong></summary>\n\n`;
  md += `The following features are disabled via feature flags and should NOT be tested:\n\n`;

  features.forEach((feature) => {
    md += `- \`${feature}\`\n`;
  });

  md += `\n</details>\n\n`;
  return md;
}

/**
 * Builds the summary stats table
 */
function buildSummaryTable(plan: TestPlanResult): string {
  const { summary, scenarios, signOffs } = plan;

  const highRiskCount = scenarios.filter((s) => s.riskLevel === 'high').length;
  const mediumRiskCount = scenarios.filter((s) => s.riskLevel === 'medium').length;
  const totalTeams = signOffs.signedOff.length + signOffs.needsAttention.length;
  const signedOffCount = signOffs.signedOff.length;

  let md = `| Risk Score | High Risk | Medium Risk | Files Changed | Teams Signed Off |\n`;
  md += `|------------|-----------|-------------|---------------|------------------|\n`;
  md += `| **${summary.releaseRiskScore}** | ${highRiskCount} | ${mediumRiskCount} | ${summary.totalFiles.toLocaleString()} | ${signedOffCount}/${totalTeams} |\n\n`;

  return md;
}

/**
 * Main function: Converts a test plan to formatted markdown
 */
export function buildTestPlanSection(testPlan: TestPlanResult): string {
  let md = `## AI Test Plan\n\n`;

  // Stats table
  md += buildSummaryTable(testPlan);

  // Executive summary
  if (testPlan.executiveSummary) {
    md += buildExecutiveSummarySection(testPlan.executiveSummary);
  }

  // All scenarios in one collapsible section
  const allScenarios = testPlan.scenarios;

  if (allScenarios.length > 0) {
    md += `<details>\n`;
    md += `<summary><strong>Release Scenarios (${allScenarios.length})</strong></summary>\n\n`;
    md += formatScenariosByRisk(allScenarios);
    md += `</details>\n\n`;
  }

  // Teams sign-off section
  if (testPlan.signOffs) {
    const totalTeams = testPlan.signOffs.signedOff.length + testPlan.signOffs.needsAttention.length;
    if (totalTeams > 0) {
      md += buildSignOffsSection(testPlan.signOffs);
    }
  }

  // Excluded features (feature flags)
  if (testPlan.excludedFeatures && testPlan.excludedFeatures.length > 0) {
    md += buildExcludedFeaturesSection(testPlan.excludedFeatures);
  }

  // Footer
  md += `---\n`;
  md += `*Generated by AI Test Plan Analyzer (${testPlan.model}) at ${testPlan.generatedAt}*\n\n`;

  // JSON link for automation (version will be replaced by caller)
  if (testPlan.version) {
    const jsonUrl = `https://metamask.github.io/metamask-mobile/test-plans/test-plan-${testPlan.version}.json`;
    md += `AI generated test plan (JSON): [test-plan-${testPlan.version}.json](${jsonUrl})\n\n`;
  }

  return md;
}

/**
 * Builds a fallback section when test plan generation fails
 */
export function buildTestPlanFailureSection(
  pipelineUrl?: string,
  errorMessage?: string,
): string {
  let md = `## AI Test Plan\n\n`;
  md += `:warning: **Test plan generation failed**`;

  if (pipelineUrl) {
    md += ` - [View logs](${pipelineUrl})`;
  }

  md += `\n\n`;

  if (errorMessage) {
    md += `<details>\n<summary>Error details</summary>\n\n`;
    md += `\`\`\`\n${errorMessage}\n\`\`\`\n\n`;
    md += `</details>\n\n`;
  }

  return md;
}
