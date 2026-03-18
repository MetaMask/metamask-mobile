/**
 * Fast Test Plan Analyzer
 *
 * Single LLM call approach (no agentic loop).
 * Analyzes PR files and generates test scenarios directly.
 */

import { ILLMProvider } from '../../providers';
import { LLM_CONFIG, APP_CONFIG } from '../../config';
import {
  PullRequestInfo,
  TeamSignOff,
  getSignOffSummary,
} from '../../utils/github-client';
import {
  CherryPickInfo,
  getFilePatchesFromAPI,
  getCommitDiff,
} from '../../utils/git-utils';

// High-impact file patterns that should include diffs
const HIGH_IMPACT_PATTERNS = [
  /^app\//,
  /^patches\//,
  /^android\/app\/src\/main\/AndroidManifest\.xml/,
  /^ios\/.*\.plist$/,
];

// Files to exclude from diff analysis (test files, docs, etc.)
const EXCLUDE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.snap$/,
  /^e2e\//,
  /^docs\//,
  /\.md$/,
  /\.stories\.[jt]sx?$/,
  /^\.github\//,
  /^bitrise\//,
  /^scripts\/.*\.sh$/,
];

/**
 * Determines if a file is high-impact and should have its diff included
 */
function isHighImpactFile(filename: string): boolean {
  // Exclude test/doc files
  if (EXCLUDE_PATTERNS.some((p) => p.test(filename))) {
    return false;
  }
  // Include if matches high-impact patterns
  return HIGH_IMPACT_PATTERNS.some((p) => p.test(filename));
}

/**
 * Extracts and summarizes diffs for high-impact files from a PR
 * Uses GitHub API to fetch individual file patches (works for large PRs)
 * Returns a truncated summary to fit within token limits
 */
function getHighImpactDiffs(
  prNumber: number,
  files: { filename: string; additions: number; deletions: number }[],
  maxTotalLines = 1500,
): string {
  // Sort files by change size (most changes first)
  const highImpactFiles = files
    .filter((f) => isHighImpactFile(f.filename))
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));

  if (highImpactFiles.length === 0) {
    return '';
  }

  console.log(
    `   Found ${highImpactFiles.length} high-impact files, fetching patches...`,
  );

  try {
    // Fetch patches for high-impact files using GitHub API (works for large PRs)
    const filenames = highImpactFiles.map((f) => f.filename);
    const patches = getFilePatchesFromAPI(
      prNumber,
      APP_CONFIG.githubRepo,
      filenames,
    );

    if (patches.size === 0) {
      console.log(`   No patches returned from API`);
      return '';
    }

    console.log(`   Got patches for ${patches.size} files`);

    // Build output, respecting max lines
    let totalLines = 0;
    const output: string[] = [];

    for (const file of highImpactFiles) {
      const patch = patches.get(file.filename);
      if (!patch) continue;

      // Extract just the changed lines (+ and - lines)
      const lines = patch.split('\n');
      const changedLines = lines.filter(
        (line) =>
          line.startsWith('+') || line.startsWith('-') || line.startsWith('@@'),
      );

      // Limit per-file to 100 lines to fit more files
      const summary = changedLines.slice(0, 100).join('\n');
      const summaryLines = summary.split('\n').length;

      if (totalLines + summaryLines > maxTotalLines) {
        // Truncate this diff to fit
        const remaining = maxTotalLines - totalLines;
        if (remaining > 20) {
          output.push(`### ${file.filename}`);
          output.push(changedLines.slice(0, remaining).join('\n'));
          output.push('... [truncated]');
        }
        break;
      }

      output.push(`### ${file.filename}`);
      output.push(summary);
      output.push('');
      totalLines += summaryLines;
    }

    return output.join('\n');
  } catch (error) {
    console.warn('   Could not fetch diffs for high-impact files:', error);
    return '';
  }
}

export interface TestScenario {
  area: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
  /** Pre-conditions required before testing */
  preconditions?: string[];
  /** Expected outcomes for validation */
  expectedOutcomes?: string[];
}

/** Executive summary for quick release overview */
export interface ExecutiveSummary {
  /** One-line release focus */
  releaseFocus: string;
  /** Key changes in this release (3-5 bullets) */
  keyChanges: string[];
  /** Critical areas requiring attention */
  criticalAreas: string[];
  /** Overall risk assessment */
  overallRisk: 'low' | 'medium' | 'high';
  /** Go/no-go recommendation */
  recommendation: string;
}

export interface TestPlanResult {
  prNumber: number;
  prTitle: string;
  version: string;
  buildNumber?: number;
  generatedAt: string;
  model: string;
  /** Executive summary for stakeholders */
  executiveSummary?: ExecutiveSummary;
  summary: {
    totalFiles: number;
    highImpactFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    highRiskCount: number;
    mediumRiskCount: number;
    /** Risk score out of 100 (aligned with Extension format) */
    releaseRiskScore: string;
  };
  scenarios: TestScenario[];
  signOffs: {
    signedOff: string[];
    needsAttention: string[];
  };
  /** Features excluded from analysis */
  excludedFeatures?: string[];
}

/**
 * Combined test plan format - aligned with Extension team format
 * Cherry-pick scenarios on top, initial scenarios below
 */
export interface CombinedTestPlanResult {
  prNumber: number;
  prTitle: string;
  generatedAt: string;
  modelUsed: string;
  /** Release version (e.g., "7.65.0") */
  version?: string;
  /** Build number */
  buildNumber?: number;
  /** Executive summary for stakeholders */
  executiveSummary?: ExecutiveSummary;
  summary: {
    totalFilesChanged: number;
    highImpactFiles?: number;
    totalCommitsInRelease?: number;
    releaseRiskScore?: string;
    highRiskScenarios: number;
    mediumRiskScenarios: number;
    cherryPickCount?: number;
    initialBuild?: number;
    currentBuild?: number;
  };
  teamsNeedingSignOff: string[];
  testScenarios: {
    cherryPickScenarios: CherryPickTestScenario[];
    initialScenarios: TestScenario[];
  };
  /** Features excluded from analysis */
  excludedFeatures?: string[];
}

export interface CherryPickTestScenario {
  area: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
  cherryPickPR?: string;
  cherryPickMessage?: string;
}

/**
 * Builds the prompt for test plan generation
 * Now includes actual diff content for high-impact files
 */
function buildPrompt(
  prInfo: PullRequestInfo,
  diffContent: string,
  excludedFeatures: string[] = [],
): string {
  const totalAdditions = prInfo.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = prInfo.files.reduce((sum, f) => sum + f.deletions, 0);

  // Build file list with change counts
  const fileList = prInfo.files
    .map((f) => `- ${f.filename} (+${f.additions} -${f.deletions})`)
    .join('\n');

  // Include diff section if available
  const diffSection = diffContent
    ? `
## Actual Code Changes (High-Impact Files)

Below are the actual diffs for high-impact files. Use these to understand WHAT specifically changed:

${diffContent}
`
    : '';

  // Build excluded features section - now supports specific flag names
  const excludedSection =
    excludedFeatures.length > 0
      ? `
## DISABLED FEATURE FLAGS (do NOT test these specific features)
The following feature flags are DISABLED - these specific capabilities are NOT available to users:
${excludedFeatures.map((f) => `- ${f}`).join('\n')}

IMPORTANT:
- DO NOT create test steps that test the disabled functionality listed above
- DO create test scenarios for the core feature if it's enabled (e.g., Perps trading works, but MYX provider doesn't)
- Flag names indicate what's disabled: "perpsMyxProviderEnabled" = MYX provider is OFF, "perpsPerpGtmOnboardingModalEnabled" = onboarding modal is OFF
- If a flag says "XyzEnabled" and it's disabled, don't test Xyz functionality
`
      : '';

  return `You are a QA engineer for MetaMask Mobile. Analyze this release PR and identify areas needing exploratory testing.

## PR Information
- PR #${prInfo.number}: ${prInfo.title}
- Files Changed: ${prInfo.files.length}
- Total Changes: +${totalAdditions} -${totalDeletions}

## Changed Files
${fileList}
${diffSection}${excludedSection}
## Your Task

1. First, provide an EXECUTIVE SUMMARY for stakeholders
2. Then, identify risky areas with DETAILED test scenarios (automation-ready)

### Executive Summary Requirements:
- **releaseFocus**: One sentence describing this release's main focus
- **keyChanges**: 3-5 bullet points of key changes
- **criticalAreas**: List areas requiring most attention
- **overallRisk**: "low", "medium", or "high"
- **recommendation**: Go/no-go recommendation with brief reasoning (do NOT mention feature flags or rollout strategies - focus only on testing readiness)

### Test Scenario Requirements:
For each scenario provide:
1. **area**: Feature area (e.g., "Card", "Swaps", "Send Flow", "Account Management")
2. **riskLevel**: "high" or "medium" only (skip low risk)
3. **preconditions**: Setup required before testing (e.g., "User has 2+ accounts", "Network is Ethereum mainnet"). Do NOT assume feature flags are enabled - focus on account state, network, and app prerequisites.
4. **testSteps**: 5-8 DETAILED steps (automation-ready, specific actions with expected results)
5. **expectedOutcomes**: What success looks like for each major step
6. **whyThisMatters**: Reference specific code changes that make this risky

## Focus Areas for MetaMask Mobile
- **Wallet Operations**: Account creation, import, backup, seed phrase
- **Transactions**: Send, receive, swap, bridge, gas estimation
- **Token Management**: Adding tokens, NFTs, balances
- **Network Management**: Adding/switching networks, RPC endpoints
- **Security**: Biometrics, password, permissions
- **Card/Ramps**: Buy, sell, card features
- **Deep Links**: URL handling, notifications
- **Performance**: Large lists, loading states

## EXCLUDE (don't create scenarios for):
- Test file changes only
- Documentation/comments only
- CI/CD config changes
- Linting/formatting changes

## Output Format

Return ONLY valid JSON:
{
  "executiveSummary": {
    "releaseFocus": "string",
    "keyChanges": ["change 1", "change 2", "change 3"],
    "criticalAreas": ["area 1", "area 2"],
    "overallRisk": "low" | "medium" | "high",
    "recommendation": "string"
  },
  "scenarios": [
    {
      "area": "string",
      "riskLevel": "high" | "medium",
      "preconditions": ["condition 1", "condition 2"],
      "testSteps": [
        "1. Navigate to X screen",
        "2. Tap Y button - verify Z appears",
        "3. Enter value A - verify input is accepted",
        "..."
      ],
      "expectedOutcomes": ["outcome 1", "outcome 2"],
      "whyThisMatters": "explanation referencing actual code changes"
    }
  ]
}

Order scenarios: HIGH risk first, then MEDIUM risk.
Return ONLY JSON, no markdown or explanation.`;
}

/**
 * Extracts version from PR title (e.g., "release: 7.65.0" -> "7.65.0")
 */
function extractVersion(prTitle: string): string {
  const match = prTitle.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Computes a risk score out of 100 based on high/medium risk scenario counts.
 * Formula aligned with Extension team: min(100, round(10 * sqrt(highRisk * 4 + mediumRisk)))
 * This gives higher weight to high-risk scenarios while capping at 100.
 */
function computeRiskScore(
  highRiskCount: number,
  mediumRiskCount: number,
): string {
  const raw = 10 * Math.sqrt(highRiskCount * 4 + mediumRiskCount);
  const score = Math.min(100, Math.round(raw));
  return `${score}/100`;
}

/**
 * Analyzes PR and generates test plan with single LLM call
 *
 * @param provider - LLM provider to use
 * @param prInfo - PR information including files, sign-offs, etc.
 * @param buildNumber - Optional build number for the RC
 * @param excludedFeatures - Features behind feature flags to exclude from analysis
 * @param releaseVersion - Optional version override (otherwise extracted from PR title)
 */
export async function analyzeWithSingleCall(
  provider: ILLMProvider,
  prInfo: PullRequestInfo,
  buildNumber?: number,
  excludedFeatures: string[] = [],
  releaseVersion?: string,
): Promise<TestPlanResult> {
  console.log(`🤖 Analyzing with ${provider.displayName}...`);

  // Fetch actual diffs for high-impact files
  console.log(`   Fetching diffs for high-impact files...`);
  const diffContent = getHighImpactDiffs(prInfo.number, prInfo.files);
  if (diffContent) {
    const diffLines = diffContent.split('\n').length;
    console.log(`   ✓ Got ${diffLines} lines of diff content`);
  } else {
    console.log(`   ⚠ No high-impact diffs found, using file names only`);
  }

  if (excludedFeatures.length > 0) {
    console.log(`   Disabled flags to exclude: ${excludedFeatures.length}`);
  }

  const prompt = buildPrompt(prInfo, diffContent, excludedFeatures);

  console.log(`   Generating test scenarios...`);

  const response = await provider.createMessage({
    model: provider.getDefaultModel(),
    maxTokens: LLM_CONFIG.maxTokens,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  // Parse JSON from response (includes executiveSummary and scenarios)
  const parsed = parseResponse(textBlock.text);

  console.log(`   ✓ Generated ${parsed.scenarios.length} test scenarios`);
  if (parsed.executiveSummary) {
    console.log(
      `   ✓ Executive summary: ${parsed.executiveSummary.overallRisk} risk\n`,
    );
  } else {
    console.log('');
  }

  // Calculate summary
  const totalAdditions = prInfo.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = prInfo.files.reduce((sum, f) => sum + f.deletions, 0);
  const highImpactFiles = prInfo.files.filter((f) =>
    isHighImpactFile(f.filename),
  ).length;

  // Count risk levels for score calculation
  const highRiskCount = parsed.scenarios.filter(
    (s) => s.riskLevel === 'high',
  ).length;
  const mediumRiskCount = parsed.scenarios.filter(
    (s) => s.riskLevel === 'medium',
  ).length;

  return {
    prNumber: prInfo.number,
    prTitle: prInfo.title,
    version: releaseVersion || extractVersion(prInfo.title),
    buildNumber,
    generatedAt: new Date().toISOString(),
    model: response.model,
    executiveSummary: parsed.executiveSummary,
    summary: {
      totalFiles: prInfo.actualFileCount || prInfo.files.length,
      highImpactFiles,
      totalAdditions,
      totalDeletions,
      highRiskCount,
      mediumRiskCount,
      releaseRiskScore: computeRiskScore(highRiskCount, mediumRiskCount),
    },
    scenarios: parsed.scenarios,
    signOffs: getSignOffSummary(prInfo.teamSignOffs),
    excludedFeatures:
      excludedFeatures.length > 0 ? excludedFeatures : undefined,
  };
}

/**
 * Parsed response from LLM including executive summary and scenarios
 */
interface ParsedLLMResponse {
  executiveSummary?: ExecutiveSummary;
  scenarios: TestScenario[];
}

/**
 * Parses LLM response to extract executive summary and scenarios
 */
function parseResponse(responseText: string): ParsedLLMResponse {
  // Try to extract JSON from response (may have markdown wrapping)
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Try to find JSON object
  const objectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonText = objectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Extract executive summary if present
    let executiveSummary: ExecutiveSummary | undefined;
    if (parsed.executiveSummary) {
      executiveSummary = {
        releaseFocus: parsed.executiveSummary.releaseFocus || '',
        keyChanges: parsed.executiveSummary.keyChanges || [],
        criticalAreas: parsed.executiveSummary.criticalAreas || [],
        overallRisk: parsed.executiveSummary.overallRisk || 'medium',
        recommendation: parsed.executiveSummary.recommendation || '',
      };
    }

    return {
      executiveSummary,
      scenarios: parsed.scenarios || [],
    };
  } catch (error) {
    console.error(
      'Failed to parse LLM response:',
      responseText.substring(0, 500),
    );
    throw new Error(`Failed to parse LLM response as JSON: ${error}`);
  }
}

// ============================================
// DELTA MODE - Cherry-pick focused analysis
// ============================================

export interface DeltaTestScenario {
  area: string;
  cherryPick: string;
  prNumber: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
}

export interface DeltaAnalysisResult {
  rcPrNumber: number;
  fromCommit: string;
  toCommit: string;
  fromBuild?: number;
  toBuild?: number;
  version: string;
  generatedAt: string;
  model: string;
  cherryPicks: CherryPickInfo[];
  scenarios: DeltaTestScenario[];
  signOffs: {
    signedOff: string[];
    needsAttention: string[];
  };
}

/**
 * Gets diffs for cherry-pick commits
 * Returns summarized diffs for each cherry-pick, limited by total lines
 */
function getCherryPickDiffs(
  cherryPicks: CherryPickInfo[],
  baseDir: string,
  maxLinesPerCommit = 200,
  maxTotalLines = 1200,
): string {
  const diffs: string[] = [];
  let totalLines = 0;
  let processedCount = 0;

  for (const cp of cherryPicks) {
    if (totalLines >= maxTotalLines) {
      const remaining = cherryPicks.length - processedCount;
      if (remaining > 0) {
        diffs.push(`\n... [${remaining} more cherry-picks truncated]`);
      }
      break;
    }
    processedCount++;

    try {
      const diff = getCommitDiff(cp.commit, baseDir, maxLinesPerCommit);
      if (diff?.trim()) {
        // Filter to only show changed lines (+ and - lines) plus some context
        const lines = diff.split('\n');
        const relevantLines = lines.filter(
          (line) =>
            line.startsWith('+') ||
            line.startsWith('-') ||
            line.startsWith('@@') ||
            line.startsWith('diff --git'),
        );

        const summary = relevantLines.slice(0, maxLinesPerCommit).join('\n');
        const label = cp.prNumber || cp.commit.substring(0, 7);
        diffs.push(`### ${label}: ${cp.message}\n${summary}`);
        totalLines += summary.split('\n').length;
      }
    } catch {
      // Skip commits we can't get diffs for
    }
  }

  return diffs.join('\n\n');
}

/**
 * Builds prompt for delta/cherry-pick analysis
 * Now includes actual diff content for cherry-picks
 */
function buildDeltaPrompt(
  cherryPicks: CherryPickInfo[],
  unsignedTeams: string[],
  diffContent: string,
): string {
  const cherryPickList = cherryPicks
    .map((cp) => `- ${cp.prNumber || cp.commit.substring(0, 7)}: ${cp.message}`)
    .join('\n');

  const unsignedSection =
    unsignedTeams.length > 0
      ? `\n## Teams that haven't signed off yet (need testing)\n${unsignedTeams.map((t) => `- ${t}`).join('\n')}\n`
      : '';

  const diffSection = diffContent
    ? `
## Actual Code Changes

Below are the actual diffs for each cherry-pick. Use these to understand WHAT specifically changed:

${diffContent}
`
    : '';

  return `You are a QA engineer for MetaMask Mobile doing RC (Release Candidate) testing before production release.

## Context
This is RC testing - the build is installed via TestFlight (iOS) or direct APK (Android). You're testing the actual app behavior, not backend configurations or rollout percentages.

## Cherry-picks in this build
${cherryPickList}
${unsignedSection}${diffSection}
## Your Task

Analyze the ACTUAL CODE CHANGES shown above to generate practical test scenarios that QA can execute on an RC build:
1. **Each cherry-pick** - specific user flows affected by the actual code changes
2. **Each unsigned team's area** - smoke tests to verify basic functionality

For each scenario provide:
1. **area**: Feature area (e.g., "Card", "Swaps", "Earn", "Onboarding")
2. **cherryPick**: The cherry-pick message (or "N/A" for unsigned team areas)
3. **prNumber**: PR number if available (or empty string)
4. **riskLevel**: "high" for cherry-picks, "medium" for unsigned areas
5. **testSteps**: 3-5 specific, actionable test steps based on the actual changes
6. **whyThisMatters**: Reference specific code changes that need testing

## Important
- Focus on USER ACTIONS that can be performed on the RC build
- Don't suggest testing backend configs, rollout percentages, or A/B tests
- Test steps should be things QA can actually do: tap buttons, navigate screens, verify UI, check transactions
- Base your test steps on the ACTUAL CODE CHANGES, not generic testing

## MetaMask-specific testing tips
- Feature flags: Check Settings > About MetaMask to verify "Remote Feature Flag Env" and "Remote Feature Flag Distribution" values
- For feature flag changes: Test that the feature controlled by the flag works correctly (appears/hidden based on flag state)
- Deep links: Test by opening links or receiving notifications
- Card/KYC: Test notification tap flows, login states, Baanx integration

## Output Format

Return ONLY valid JSON:
{
  "scenarios": [
    {
      "area": "string",
      "cherryPick": "string",
      "prNumber": "string",
      "riskLevel": "high" | "medium",
      "testSteps": ["1. step one", "2. step two", "3. step three"],
      "whyThisMatters": "explanation referencing actual code changes"
    }
  ]
}

Return ONLY JSON, no markdown or explanation.`;
}

/**
 * Analyzes cherry-picks with LLM to generate focused test scenarios
 */
export async function analyzeDeltaWithLLM(
  provider: ILLMProvider,
  cherryPicks: CherryPickInfo[],
  teamSignOffs: TeamSignOff[],
  rcPrNumber: number,
  fromCommit: string,
  toCommit: string,
  version: string,
  baseDir: string,
  fromBuild?: number,
  toBuild?: number,
): Promise<DeltaAnalysisResult> {
  // Get teams that haven't signed off
  const unsignedTeams = teamSignOffs
    .filter((t) => !t.signedOff)
    .map((t) => t.team);

  console.log(
    `🤖 Analyzing ${cherryPicks.length} cherry-pick(s) + ${unsignedTeams.length} unsigned team(s) with ${provider.displayName}...`,
  );

  // Fetch actual diffs for cherry-picks
  console.log(`   Fetching diffs for cherry-pick commits...`);
  const diffContent = getCherryPickDiffs(cherryPicks, baseDir);
  if (diffContent) {
    const diffLines = diffContent.split('\n').length;
    console.log(`   ✓ Got ${diffLines} lines of diff content`);
  } else {
    console.log(`   ⚠ No cherry-pick diffs found, using commit messages only`);
  }

  const prompt = buildDeltaPrompt(cherryPicks, unsignedTeams, diffContent);

  console.log(`   Generating test scenarios...`);

  const response = await provider.createMessage({
    model: provider.getDefaultModel(),
    maxTokens: LLM_CONFIG.maxTokens,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  // Parse JSON from response
  const scenarios = parseDeltaResponse(textBlock.text);

  console.log(
    `   ✓ Generated ${scenarios.length} test scenarios for cherry-picks\n`,
  );

  return {
    rcPrNumber,
    fromCommit,
    toCommit,
    fromBuild,
    toBuild,
    version,
    generatedAt: new Date().toISOString(),
    model: response.model,
    cherryPicks,
    scenarios,
    signOffs: getSignOffSummary(teamSignOffs),
  };
}

/**
 * Parses LLM response for delta scenarios
 */
function parseDeltaResponse(responseText: string): DeltaTestScenario[] {
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Try to find JSON object
  const objectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonText = objectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed.scenarios || [];
  } catch (error) {
    console.error(
      'Failed to parse delta LLM response:',
      responseText.substring(0, 500),
    );
    throw new Error(`Failed to parse delta LLM response as JSON: ${error}`);
  }
}

// ============================================
// COMBINED FORMAT - Aligned with Extension team
// ============================================

/**
 * Combines initial test plan with cherry-pick scenarios into extension-aligned format
 */
export function createCombinedTestPlan(
  initialResult: TestPlanResult,
  deltaResult?: DeltaAnalysisResult,
): CombinedTestPlanResult {
  // Convert delta scenarios to cherry-pick format
  const cherryPickScenarios: CherryPickTestScenario[] = deltaResult
    ? deltaResult.scenarios
        .filter((s) => s.cherryPick && s.cherryPick !== 'N/A')
        .map((s) => ({
          area: s.area,
          riskLevel: s.riskLevel,
          testSteps: s.testSteps,
          whyThisMatters: s.whyThisMatters,
          cherryPickPR: s.prNumber || undefined,
          cherryPickMessage: s.cherryPick,
        }))
    : [];

  // Calculate risk counts including cherry-picks
  const cpHighRisk = cherryPickScenarios.filter(
    (s) => s.riskLevel === 'high',
  ).length;
  const cpMediumRisk = cherryPickScenarios.filter(
    (s) => s.riskLevel === 'medium',
  ).length;

  // Total risk counts for combined score
  const totalHighRisk = initialResult.summary.highRiskCount + cpHighRisk;
  const totalMediumRisk = initialResult.summary.mediumRiskCount + cpMediumRisk;

  return {
    prNumber: initialResult.prNumber,
    prTitle: initialResult.prTitle,
    generatedAt: new Date().toISOString(),
    modelUsed: initialResult.model,
    version: initialResult.version,
    buildNumber: initialResult.buildNumber,
    executiveSummary: initialResult.executiveSummary,
    summary: {
      totalFilesChanged: initialResult.summary.totalFiles,
      highImpactFiles: initialResult.summary.highImpactFiles,
      highRiskScenarios: totalHighRisk,
      mediumRiskScenarios: totalMediumRisk,
      releaseRiskScore: computeRiskScore(totalHighRisk, totalMediumRisk),
      cherryPickCount: deltaResult?.cherryPicks.length || 0,
      initialBuild: deltaResult?.fromBuild,
      currentBuild: deltaResult?.toBuild || initialResult.buildNumber,
    },
    teamsNeedingSignOff: initialResult.signOffs.needsAttention,
    testScenarios: {
      cherryPickScenarios,
      initialScenarios: initialResult.scenarios,
    },
    excludedFeatures: initialResult.excludedFeatures,
  };
}
