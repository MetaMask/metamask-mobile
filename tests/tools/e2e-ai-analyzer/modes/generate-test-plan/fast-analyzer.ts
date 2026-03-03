/**
 * Fast Test Plan Analyzer
 *
 * Single LLM call approach (no agentic loop).
 * Analyzes PR files and generates test scenarios directly.
 */

import { ILLMProvider } from '../../providers';
import { LLM_CONFIG } from '../../config';
import {
  PullRequestInfo,
  TeamSignOff,
  getSignOffSummary,
} from '../../utils/github-client';
import { CherryPickInfo, getPRDiff, getCommitDiff } from '../../utils/git-utils';

// Repository for fetching diffs
const DEFAULT_REPO = 'MetaMask/metamask-mobile';

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

  try {
    // Fetch full PR diff
    const fullDiff = getPRDiff(prNumber, DEFAULT_REPO, undefined, 50000);

    if (!fullDiff || fullDiff.includes('Could not fetch')) {
      return '';
    }

    // Extract diffs for high-impact files only
    const fileDiffs: { filename: string; diff: string }[] = [];
    const sections = fullDiff.split('diff --git');

    for (const section of sections) {
      if (!section.trim()) continue;

      for (const file of highImpactFiles) {
        if (section.includes(file.filename)) {
          // Extract just the changed lines (+ and - lines)
          const lines = section.split('\n');
          const changedLines = lines.filter(
            (line) =>
              line.startsWith('+') ||
              line.startsWith('-') ||
              line.startsWith('@@'),
          );
          // Include file header and changed lines
          const headerLines = lines.slice(0, 4);
          const summary = [...headerLines, ...changedLines.slice(0, 100)].join(
            '\n',
          );
          fileDiffs.push({ filename: file.filename, diff: summary });
          break;
        }
      }
    }

    // Build output, respecting max lines
    let totalLines = 0;
    const output: string[] = [];

    for (const { filename, diff } of fileDiffs) {
      const diffLines = diff.split('\n').length;
      if (totalLines + diffLines > maxTotalLines) {
        // Truncate this diff to fit
        const remaining = maxTotalLines - totalLines;
        if (remaining > 20) {
          output.push(`### ${filename}`);
          output.push(diff.split('\n').slice(0, remaining).join('\n'));
          output.push('... [truncated]');
        }
        break;
      }
      output.push(`### ${filename}`);
      output.push(diff);
      output.push('');
      totalLines += diffLines;
    }

    return output.join('\n');
  } catch (error) {
    console.warn('   Could not fetch diffs for high-impact files');
    return '';
  }
}

export type TestScenario = {
  area: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
};

export type TestPlanResult = {
  prNumber: number;
  prTitle: string;
  version: string;
  buildNumber?: number;
  generatedAt: string;
  model: string;
  summary: {
    totalFiles: number;
    highImpactFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    highRiskCount: number;
    mediumRiskCount: number;
  };
  scenarios: TestScenario[];
  signOffs: {
    signedOff: string[];
    needsAttention: string[];
  };
};

/**
 * Combined test plan format - aligned with Extension team format
 * Cherry-pick scenarios on top, initial scenarios below
 */
export type CombinedTestPlanResult = {
  prNumber: number;
  prTitle: string;
  generatedAt: string;
  modelUsed: string;
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
};

export type CherryPickTestScenario = {
  area: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
  cherryPickPR?: string;
  cherryPickMessage?: string;
};

/**
 * Builds the prompt for test plan generation
 * Now includes actual diff content for high-impact files
 */
function buildPrompt(prInfo: PullRequestInfo, diffContent: string): string {
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

  return `You are a QA engineer for MetaMask Mobile. Analyze this release PR and identify areas needing exploratory testing.

## PR Information
- PR #${prInfo.number}: ${prInfo.title}
- Files Changed: ${prInfo.files.length}
- Total Changes: +${totalAdditions} -${totalDeletions}

## Changed Files
${fileList}
${diffSection}
## Your Task

Analyze the ACTUAL CODE CHANGES shown above to identify risky areas. Base your test scenarios on what the code is actually doing, not just file names.

For each scenario provide:
1. **area**: Feature area (e.g., "Card", "Swaps", "Send Flow", "Account Management")
2. **riskLevel**: "high" or "medium" only (skip low risk)
3. **testSteps**: 3-5 specific test steps based on the actual changes
4. **whyThisMatters**: Reference specific code changes that make this risky

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
  "scenarios": [
    {
      "area": "string",
      "riskLevel": "high" | "medium",
      "testSteps": ["1. step one", "2. step two", "3. step three"],
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
 * Analyzes PR and generates test plan with single LLM call
 */
export async function analyzeWithSingleCall(
  provider: ILLMProvider,
  prInfo: PullRequestInfo,
  buildNumber?: number,
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

  const prompt = buildPrompt(prInfo, diffContent);

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
  const scenarios = parseResponse(textBlock.text);

  console.log(`   ✓ Generated ${scenarios.length} test scenarios\n`);

  // Calculate summary
  const totalAdditions = prInfo.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = prInfo.files.reduce((sum, f) => sum + f.deletions, 0);
  const highImpactFiles = prInfo.files.filter((f) => isHighImpactFile(f.filename)).length;

  return {
    prNumber: prInfo.number,
    prTitle: prInfo.title,
    version: extractVersion(prInfo.title),
    buildNumber,
    generatedAt: new Date().toISOString(),
    model: response.model,
    summary: {
      totalFiles: prInfo.actualFileCount || prInfo.files.length,
      highImpactFiles,
      totalAdditions,
      totalDeletions,
      highRiskCount: scenarios.filter((s) => s.riskLevel === 'high').length,
      mediumRiskCount: scenarios.filter((s) => s.riskLevel === 'medium').length,
    },
    scenarios,
    signOffs: getSignOffSummary(prInfo.teamSignOffs),
  };
}

/**
 * Parses LLM response to extract scenarios
 */
function parseResponse(responseText: string): TestScenario[] {
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
    return parsed.scenarios || [];
  } catch (error) {
    console.error('Failed to parse LLM response:', responseText.substring(0, 500));
    throw new Error(`Failed to parse LLM response as JSON: ${error}`);
  }
}

// ============================================
// DELTA MODE - Cherry-pick focused analysis
// ============================================

export type DeltaTestScenario = {
  area: string;
  cherryPick: string;
  prNumber: string;
  riskLevel: 'high' | 'medium';
  testSteps: string[];
  whyThisMatters: string;
};

export type DeltaAnalysisResult = {
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
};

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

  for (const cp of cherryPicks) {
    if (totalLines >= maxTotalLines) {
      diffs.push(`\n... [${cherryPicks.length - diffs.length} more cherry-picks truncated]`);
      break;
    }

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
        totalLines += relevantLines.length;
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

  const unsignedSection = unsignedTeams.length > 0
    ? `\n## Teams that haven't signed off yet (need testing)\n${unsignedTeams.map(t => `- ${t}`).join('\n')}\n`
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
  fromBuild?: number,
  toBuild?: number,
  baseDir: string = process.cwd(),
): Promise<DeltaAnalysisResult> {
  // Get teams that haven't signed off
  const unsignedTeams = teamSignOffs
    .filter(t => !t.signedOff)
    .map(t => t.team);

  console.log(`🤖 Analyzing ${cherryPicks.length} cherry-pick(s) + ${unsignedTeams.length} unsigned team(s) with ${provider.displayName}...`);

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

  console.log(`   ✓ Generated ${scenarios.length} test scenarios for cherry-picks\n`);

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
    console.error('Failed to parse delta LLM response:', responseText.substring(0, 500));
    throw new Error(`Failed to parse delta LLM response as JSON: ${error}`);
  }
}

/**
 * Formats delta analysis as Slack-readable markdown
 */
export function formatDeltaForSlack(result: DeltaAnalysisResult): string {
  const lines: string[] = [];
  const date = new Date(result.generatedAt).toLocaleDateString();

  // Build label: prefer build numbers, fallback to commits
  let buildLabel: string;
  if (result.fromBuild && result.toBuild) {
    buildLabel = `Build ${result.fromBuild} → ${result.toBuild}`;
  } else if (result.toBuild) {
    buildLabel = `Build ${result.toBuild}`;
  } else {
    const fromLabel = result.fromCommit.substring(0, 7);
    const toLabel = result.toCommit.substring(0, 7);
    buildLabel = `${fromLabel} → ${toLabel}`;
  }

  // Header
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🍒 BUILD DELTA TEST PLAN`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`RC ${result.version} | ${buildLabel}`);
  lines.push(`Generated: ${date}`);
  lines.push(`• https://github.com/MetaMask/metamask-mobile/pull/${result.rcPrNumber}`);
  lines.push('');

  // Cherry-picks summary - clean up the message to remove "chore(runway): cherry-pick" prefix
  lines.push(`${result.cherryPicks.length} cherry-pick(s) in this build:`);
  result.cherryPicks.forEach((cp) => {
    // Remove "chore(runway): cherry-pick" prefix, keep only the actual fix message
    const cleanMessage = cp.message.replace(/^chore\(runway\):\s*cherry-pick\s*/i, '');
    lines.push(`  • ${cleanMessage}`);
  });
  lines.push('');

  // Split scenarios: cherry-picks vs unsigned teams
  const cherryPickScenarios = result.scenarios.filter(s => s.cherryPick && s.cherryPick !== 'N/A');
  const unsignedTeamScenarios = result.scenarios.filter(s => !s.cherryPick || s.cherryPick === 'N/A');

  // Cherry-pick scenarios (high priority - new changes)
  if (cherryPickScenarios.length > 0) {
    lines.push(`🧪 TEST SCENARIOS FOR CHERRY-PICKS`);
    lines.push('');

    cherryPickScenarios.forEach((scenario, i) => {
      lines.push(`🔴 ${i + 1}. ${scenario.area}`);
      if (scenario.prNumber) {
        lines.push(`   Cherry-pick: #${scenario.prNumber}`);
      }
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  // Unsigned team scenarios (areas still needing verification)
  if (unsignedTeamScenarios.length > 0) {
    lines.push(`⏳ AREAS STILL NEEDING TESTING`);
    lines.push('');

    unsignedTeamScenarios.forEach((scenario, i) => {
      lines.push(`🟡 ${i + 1}. ${scenario.area}`);
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  // Only show "all signed off" message if no teams need attention
  // (unsigned teams are already shown in "Areas Still Needing Testing" section)
  if (result.signOffs.needsAttention.length === 0) {
    lines.push(`✅ All teams have signed off`);
  }

  return lines.join('\n');
}

/**
 * Formats test plan as Slack-readable markdown
 * No # headers, emojis per item, italics for section labels
 */
export function formatForSlack(result: TestPlanResult): string {
  const lines: string[] = [];
  const date = new Date(result.generatedAt).toLocaleDateString();

  // Build label
  const buildLabel = result.buildNumber ? `Build ${result.buildNumber}` : '';

  // Header
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 RELEASE TEST PLAN`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`RC ${result.version}${buildLabel ? ` | ${buildLabel}` : ''}`);
  lines.push(`Generated: ${date}`);
  lines.push(`• https://github.com/MetaMask/metamask-mobile/pull/${result.prNumber}`);
  lines.push('');

  // Summary
  lines.push(`  • Files changed: ${result.summary.totalFiles} (${result.summary.highImpactFiles} high-impact)`);
  lines.push(`  • High risk areas: ${result.summary.highRiskCount}`);
  lines.push(`  • Medium risk areas: ${result.summary.mediumRiskCount}`);
  lines.push('');

  // Only show teams that need attention
  if (result.signOffs.needsAttention.length > 0) {
    lines.push(`Teams needing sign-off (${result.signOffs.needsAttention.length}):`);
    result.signOffs.needsAttention.forEach((team) => {
      lines.push(`  ⏳ ${team}`);
    });
    lines.push('');
  } else {
    lines.push(`✅ All teams have signed off`);
    lines.push('');
  }

  // High risk scenarios
  const highRisk = result.scenarios.filter((s) => s.riskLevel === 'high');
  if (highRisk.length > 0) {
    lines.push(`🔴 HIGH RISK AREAS`);
    lines.push('');
    highRisk.forEach((scenario, i) => {
      lines.push(`${i + 1}. ${scenario.area}`);
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  // Medium risk scenarios
  const mediumRisk = result.scenarios.filter((s) => s.riskLevel === 'medium');
  if (mediumRisk.length > 0) {
    lines.push(`🟡 MEDIUM RISK AREAS`);
    lines.push('');
    mediumRisk.forEach((scenario, i) => {
      lines.push(`${i + 1}. ${scenario.area}`);
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  return lines.join('\n');
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
  const cpHighRisk = cherryPickScenarios.filter((s) => s.riskLevel === 'high').length;
  const cpMediumRisk = cherryPickScenarios.filter((s) => s.riskLevel === 'medium').length;

  return {
    prNumber: initialResult.prNumber,
    prTitle: initialResult.prTitle,
    generatedAt: new Date().toISOString(),
    modelUsed: initialResult.model,
    summary: {
      totalFilesChanged: initialResult.summary.totalFiles,
      highImpactFiles: initialResult.summary.highImpactFiles,
      highRiskScenarios: initialResult.summary.highRiskCount + cpHighRisk,
      mediumRiskScenarios: initialResult.summary.mediumRiskCount + cpMediumRisk,
      cherryPickCount: deltaResult?.cherryPicks.length || 0,
      initialBuild: deltaResult?.fromBuild,
      currentBuild: deltaResult?.toBuild || initialResult.buildNumber,
    },
    teamsNeedingSignOff: initialResult.signOffs.needsAttention,
    testScenarios: {
      cherryPickScenarios,
      initialScenarios: initialResult.scenarios,
    },
  };
}

/**
 * Formats combined test plan for Slack - cherry-picks on top
 */
export function formatCombinedForSlack(result: CombinedTestPlanResult): string {
  const lines: string[] = [];
  const date = new Date(result.generatedAt).toLocaleDateString();

  // Build label
  let buildLabel = '';
  if (result.summary.currentBuild) {
    buildLabel = `Build ${result.summary.currentBuild}`;
  }

  // Header
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 RELEASE TEST PLAN`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Extract version from title
  const version = result.prTitle.match(/(\d+\.\d+\.\d+)/)?.[1] || 'unknown';
  lines.push(`RC ${version}${buildLabel ? ` | ${buildLabel}` : ''}`);
  lines.push(`Generated: ${date}`);
  lines.push(`• https://github.com/MetaMask/metamask-mobile/pull/${result.prNumber}`);
  lines.push('');

  // Summary
  const highImpactLabel = result.summary.highImpactFiles ? ` (${result.summary.highImpactFiles} high-impact)` : '';
  lines.push(`  • Files changed: ${result.summary.totalFilesChanged}${highImpactLabel}`);
  lines.push(`  • High risk areas: ${result.summary.highRiskScenarios}`);
  lines.push(`  • Medium risk areas: ${result.summary.mediumRiskScenarios}`);
  if (result.summary.cherryPickCount && result.summary.cherryPickCount > 0) {
    lines.push(`  • Cherry-picks since initial: ${result.summary.cherryPickCount}`);
  }
  lines.push('');

  // Teams needing sign-off
  if (result.teamsNeedingSignOff.length > 0) {
    lines.push(`Teams needing sign-off (${result.teamsNeedingSignOff.length}):`);
    result.teamsNeedingSignOff.forEach((team) => {
      lines.push(`  ⏳ ${team}`);
    });
    lines.push('');
  } else {
    lines.push(`✅ All teams have signed off`);
    lines.push('');
  }

  // ======= CHERRY-PICK SCENARIOS ON TOP =======
  if (result.testScenarios.cherryPickScenarios.length > 0) {
    lines.push(`🍒 CHERRY-PICK SCENARIOS (since initial build)`);
    lines.push('');

    const cpHigh = result.testScenarios.cherryPickScenarios.filter((s) => s.riskLevel === 'high');
    const cpMedium = result.testScenarios.cherryPickScenarios.filter((s) => s.riskLevel === 'medium');

    cpHigh.forEach((scenario, i) => {
      lines.push(`🔴 ${i + 1}. ${scenario.area}`);
      if (scenario.cherryPickPR) {
        lines.push(`   Cherry-pick: #${scenario.cherryPickPR}`);
      }
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });

    cpMedium.forEach((scenario, i) => {
      lines.push(`🟡 ${cpHigh.length + i + 1}. ${scenario.area}`);
      if (scenario.cherryPickPR) {
        lines.push(`   Cherry-pick: #${scenario.cherryPickPR}`);
      }
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  // ======= INITIAL SCENARIOS BELOW =======
  lines.push(`📋 INITIAL SCENARIOS (from RC cut)`);
  lines.push('');

  // High risk scenarios
  const highRisk = result.testScenarios.initialScenarios.filter((s) => s.riskLevel === 'high');
  if (highRisk.length > 0) {
    lines.push(`🔴 HIGH RISK AREAS`);
    lines.push('');
    highRisk.forEach((scenario, i) => {
      lines.push(`${i + 1}. ${scenario.area}`);
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  // Medium risk scenarios
  const mediumRisk = result.testScenarios.initialScenarios.filter((s) => s.riskLevel === 'medium');
  if (mediumRisk.length > 0) {
    lines.push(`🟡 MEDIUM RISK AREAS`);
    lines.push('');
    mediumRisk.forEach((scenario, i) => {
      lines.push(`${i + 1}. ${scenario.area}`);
      lines.push(`   Why: ${scenario.whyThisMatters}`);
      lines.push('');
      lines.push('   Test steps:');
      scenario.testSteps.forEach((step) => {
        lines.push(`     • ${step}`);
      });
      lines.push('');
    });
  }

  return lines.join('\n');
}
