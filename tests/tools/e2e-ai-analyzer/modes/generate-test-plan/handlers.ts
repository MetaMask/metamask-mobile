/**
 * Mode-specific logic for generating exploratory test plans
 */

import { writeFileSync } from 'node:fs';
import {
  GenerateTestPlanAnalysis,
  FeatureAreaTestPlan,
  TestPlanSummary,
  PlatformNotes,
  TestAreaRisk,
  TestingStatus,
  BuildChangeInfo,
  ExplorationTheme,
  ExploratoryFocusArea,
} from '../../types';
import { smokeTags, flaskTags } from '../../../../tags';

/**
 * Human-friendly feature area names mapping
 */
const FEATURE_AREA_DISPLAY_NAMES: Record<string, string> = {
  // Tag names (PascalCase)
  SmokeAccounts: 'Accounts',
  SmokeConfirmations: 'Confirmations (Transactions/Signatures)',
  SmokeIdentity: 'Identity (Profile Sync)',
  SmokeNetworkAbstractions: 'Networks',
  SmokeNetworkExpansion: 'Multi-Chain (Solana/Non-EVM)',
  SmokeTrade: 'Trade (Swap/Bridge)',
  SmokeWalletPlatform: 'Wallet Platform (Navigation/Core)',
  SmokeCard: 'Card',
  SmokePerps: 'Perps',
  SmokeRamps: 'Buy/Sell (Ramps)',
  SmokeMultiChainAPI: 'Multi-Chain API (CAIP-25)',
  SmokePredictions: 'Predictions (Polymarket)',
  FlaskBuildTests: 'Snaps (Flask)',
  // Commit scope names (lowercase from conventional commits)
  card: 'Card',
  perps: 'Perps',
  ramps: 'Buy/Sell (Ramps)',
  trade: 'Trade (Swap/Bridge)',
  swap: 'Trade (Swap/Bridge)',
  bridge: 'Trade (Swap/Bridge)',
  accounts: 'Accounts',
  confirmations: 'Confirmations (Transactions/Signatures)',
  identity: 'Identity (Profile Sync)',
  networks: 'Networks',
  snaps: 'Snaps (Flask)',
  notifications: 'Notifications',
  wallet: 'Wallet Platform (Navigation/Core)',
};

/**
 * Get human-friendly display name for a feature area
 */
export function getFeatureAreaDisplayName(tag: string): string {
  return FEATURE_AREA_DISPLAY_NAMES[tag] || tag;
}

/**
 * Feature areas derived from tags for test plan generation
 */
const allTags = { ...smokeTags, ...flaskTags };

export const FEATURE_AREAS_CONFIG = Object.values(allTags).map((config) => ({
  tag: config.tag.replace(':', ''),
  displayName:
    FEATURE_AREA_DISPLAY_NAMES[config.tag.replace(':', '')] ||
    config.tag.replace(':', ''),
  description: config.description,
}));

/**
 * Creates an empty platform notes object
 */
function createEmptyPlatformNotes(): PlatformNotes {
  return { ios: [], android: [], shared: [] };
}

/**
 * Creates default testing status (not tested)
 */
function createDefaultTestingStatus(): TestingStatus {
  return {
    tested: false,
    testedBy: [],
  };
}

/**
 * Creates default build change info (not new)
 */
function createDefaultBuildChangeInfo(): BuildChangeInfo {
  return { isNewInBuild: false };
}

/**
 * Default exploration themes applicable to any mobile app testing
 */
const DEFAULT_EXPLORATION_THEMES: ExplorationTheme[] = [
  {
    name: 'Interruption Testing',
    description: 'Test how the app handles interruptions during critical flows',
    techniques: [
      'Background the app mid-flow and resume',
      'Kill the app and reopen',
      'Receive a phone call during a transaction',
      'Lock/unlock the device',
      'Switch to another app and back',
    ],
    applicableAreas: [],
  },
  {
    name: 'Connectivity Testing',
    description: 'Test behavior under various network conditions',
    techniques: [
      'Toggle airplane mode during operations',
      'Switch between WiFi and cellular',
      'Test with slow/throttled network',
      'Test offline → online transitions',
      'Test with VPN connected/disconnected',
    ],
    applicableAreas: [],
  },
  {
    name: 'Boundary Testing',
    description: 'Test extreme values and edge cases in inputs',
    techniques: [
      'Test with maximum allowed values',
      'Test with minimum/zero values',
      'Test with empty inputs',
      'Test with special characters and unicode',
      'Test with very long strings',
    ],
    applicableAreas: [],
  },
  {
    name: 'State Permutation',
    description: 'Test different combinations of app/user states',
    techniques: [
      'Test with different wallet types (imported, hardware, fresh)',
      'Test with multiple accounts',
      'Test with different network configurations',
      'Test as new user vs returning user',
      'Test with different permission states',
    ],
    applicableAreas: [],
  },
  {
    name: 'Platform-Specific Exploration',
    description: 'Explore iOS and Android specific behaviors',
    techniques: [
      'Test gesture navigation vs button navigation (Android)',
      'Test with different notch/Dynamic Island configurations (iOS)',
      'Test with accessibility features enabled',
      'Test with different font sizes/display scales',
      'Test with dark mode vs light mode',
    ],
    applicableAreas: [],
  },
  {
    name: 'Hardware Wallet Testing',
    description: 'Test flows with connected hardware wallets',
    techniques: [
      'Test with Ledger connected via USB/Bluetooth',
      'Test transaction signing with hardware wallet',
      'Test hardware wallet disconnection mid-flow',
      'Test with multiple hardware wallet accounts',
      'Test hardware wallet firmware edge cases',
    ],
    applicableAreas: ['SmokeConfirmations', 'SmokeAccounts', 'SmokeTrade'],
  },
  {
    name: 'Test dApp Exploration',
    description: 'Use test dApps to explore wallet-dApp interactions',
    techniques: [
      'Test with MetaMask Test Dapp (test-dapp.metamask.io)',
      'Explore signature request variations',
      'Test transaction parameter edge cases',
      'Test chain switching requests',
      'Test permission request flows',
    ],
    applicableAreas: ['SmokeConfirmations', 'SmokeMultiChainAPI'],
  },
];

/**
 * Creates an empty test plan when no changes detected
 */
export function createEmptyResult(): GenerateTestPlanAnalysis {
  return {
    summary: {
      totalChangedFiles: 0,
      totalCommits: 0,
      criticalAreas: 0,
      highRiskAreas: 0,
      mediumRiskAreas: 0,
      lowRiskAreas: 0,
      estimatedTestingHours: '0',
      releaseVersion: 'unknown',
      areasTestedCount: 0,
      areasNotTestedCount: 0,
      newInThisBuildCount: 0,
    },
    featureAreas: [],
    crossCuttingConcerns: [],
    regressionFocusAreas: [],
    platformSpecificGuidance: createEmptyPlatformNotes(),
    explorationThemes: [],
    exploratoryFocusAreas: [],
    cherryPicks: [],
    reasoning: 'No files changed - no test plan needed',
    confidence: 100,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a conservative test plan when AI fails
 */
export function createConservativeResult(): GenerateTestPlanAnalysis {
  const allFeatureAreas: FeatureAreaTestPlan[] = FEATURE_AREAS_CONFIG.map(
    (config, index) => ({
      featureArea: config.tag,
      displayName: config.displayName,
      riskLevel: 'high' as TestAreaRisk,
      riskJustification:
        'AI analysis failed - comprehensive testing recommended',
      impactedComponents: ['Unknown - manual review needed'],
      exploratoryScenarios: [
        {
          id: `${config.tag}-fallback-1`,
          title: `Full ${config.displayName} regression`,
          description: `Perform comprehensive regression testing for ${config.displayName}`,
          preconditions: ['App installed', 'Valid test account available'],
          explorationGuidance: [
            'Test all major user flows',
            'Check edge cases',
          ],
          riskIndicators: ['AI analysis unavailable'],
          relatedChanges: [],
        },
      ],
      platformNotes: {
        ios: ['Test on iOS simulator and device'],
        android: ['Test on Android emulator and device'],
        shared: ['Verify feature parity between platforms'],
      },
      priority: index + 1,
      testingStatus: createDefaultTestingStatus(),
      buildChangeInfo: createDefaultBuildChangeInfo(),
      exploratoryPriority: 5, // Medium priority when AI fails
      explorationCharters: [
        {
          id: `${config.tag}-charter-1`,
          mission: `Explore ${config.displayName} for unexpected behaviors`,
          context: 'AI analysis unavailable - broad exploration recommended',
          whatIfs: [
            'What if the user interrupts the flow mid-way?',
            'What if network conditions change?',
            'What if the user has unusual account state?',
          ],
          timeBox: '30 minutes',
        },
      ],
    }),
  );

  return {
    summary: {
      totalChangedFiles: 0,
      totalCommits: 0,
      criticalAreas: allFeatureAreas.length,
      highRiskAreas: allFeatureAreas.length,
      mediumRiskAreas: 0,
      lowRiskAreas: 0,
      estimatedTestingHours: '8-12',
      releaseVersion: 'unknown',
      areasTestedCount: 0,
      areasNotTestedCount: allFeatureAreas.length,
      newInThisBuildCount: 0,
    },
    featureAreas: allFeatureAreas,
    crossCuttingConcerns: ['AI analysis failed - full regression recommended'],
    regressionFocusAreas: FEATURE_AREAS_CONFIG.map((c) => c.tag),
    platformSpecificGuidance: {
      ios: ['Full iOS regression required'],
      android: ['Full Android regression required'],
      shared: ['Test all shared functionality'],
    },
    explorationThemes: DEFAULT_EXPLORATION_THEMES,
    exploratoryFocusAreas: allFeatureAreas.slice(0, 5).map((area) => ({
      featureArea: area.featureArea,
      displayName: area.displayName,
      exploratoryPriority: area.exploratoryPriority,
      reason: 'AI analysis unavailable - all areas require exploration',
      suggestedTimeBox: '30 minutes',
    })),
    cherryPicks: [],
    reasoning:
      'Fallback: AI analysis did not complete successfully. Comprehensive testing recommended.',
    confidence: 0,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Processes AI response and returns test plan analysis
 */
export async function processAnalysis(
  aiResponse: string,
  _baseDir: string,
): Promise<GenerateTestPlanAnalysis | null> {
  // Parse JSON from AI response
  const jsonMatch = aiResponse.match(
    /\{[\s\S]*"summary"[\s\S]*"feature_areas"[\s\S]*\}/,
  );

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.summary || !Array.isArray(parsed.feature_areas)) {
      return null;
    }

    // Transform snake_case to camelCase
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const featureAreas: FeatureAreaTestPlan[] = parsed.feature_areas.map(
      (area: any) => ({
        featureArea: area.feature_area,
        displayName: getFeatureAreaDisplayName(area.feature_area),
        riskLevel: area.risk_level,
        riskJustification: area.risk_justification || '',
        impactedComponents: area.impacted_components || [],
        exploratoryScenarios: (area.exploratory_scenarios || []).map(
          (s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            preconditions: s.preconditions || [],
            explorationGuidance: s.exploration_guidance || [],
            riskIndicators: s.risk_indicators || [],
            relatedChanges: s.related_changes || [],
          }),
        ),
        platformNotes: {
          ios: area.platform_notes?.ios || [],
          android: area.platform_notes?.android || [],
          shared: area.platform_notes?.shared || [],
        },
        priority: area.priority || 999,
        testingStatus: area.testing_status
          ? {
              tested: area.testing_status.tested || false,
              testedBy: area.testing_status.tested_by || [],
              testedDate: area.testing_status.tested_date,
            }
          : createDefaultTestingStatus(),
        buildChangeInfo: area.build_change_info
          ? {
              isNewInBuild: area.build_change_info.is_new_in_build || false,
              buildNumber: area.build_change_info.build_number,
              relatedPRs: area.build_change_info.related_prs,
              changeType: area.build_change_info.change_type,
            }
          : createDefaultBuildChangeInfo(),
        exploratoryPriority: area.exploratory_priority || 5,
        explorationCharters: (area.exploration_charters || []).map(
          (charter: any) => ({
            id: charter.id,
            mission: charter.mission,
            context: charter.context || '',
            whatIfs: charter.what_ifs || [],
            timeBox: charter.time_box,
          }),
        ),
      }),
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Calculate testing status counts from feature areas
    const areasTestedCount = featureAreas.filter(
      (a) => a.testingStatus.tested,
    ).length;
    const areasNotTestedCount = featureAreas.filter(
      (a) => !a.testingStatus.tested,
    ).length;
    const newInThisBuildCount = featureAreas.filter(
      (a) => a.buildChangeInfo.isNewInBuild,
    ).length;

    const summary: TestPlanSummary = {
      totalChangedFiles: parsed.summary.total_changed_files || 0,
      totalCommits: parsed.summary.total_commits || 0,
      criticalAreas: parsed.summary.critical_areas || 0,
      highRiskAreas: parsed.summary.high_risk_areas || 0,
      mediumRiskAreas: parsed.summary.medium_risk_areas || 0,
      lowRiskAreas: parsed.summary.low_risk_areas || 0,
      estimatedTestingHours:
        parsed.summary.estimated_testing_hours || 'unknown',
      releaseVersion: parsed.summary.release_version || 'unknown',
      buildNumber: parsed.summary.build_number,
      previousBuildNumber: parsed.summary.previous_build_number,
      areasTestedCount,
      areasNotTestedCount,
      newInThisBuildCount,
    };

    // Parse exploration themes (use defaults if not provided)
    const explorationThemes: ExplorationTheme[] = parsed.exploration_themes
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.exploration_themes.map((theme: any) => ({
          name: theme.name,
          description: theme.description,
          techniques: theme.techniques || [],
          applicableAreas: theme.applicable_areas || [],
        }))
      : DEFAULT_EXPLORATION_THEMES;

    // Parse or derive exploratory focus areas
    const exploratoryFocusAreas: ExploratoryFocusArea[] =
      parsed.exploratory_focus_areas
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsed.exploratory_focus_areas.map((focus: any) => ({
            featureArea: focus.feature_area,
            displayName: getFeatureAreaDisplayName(focus.feature_area),
            exploratoryPriority: focus.exploratory_priority,
            reason: focus.reason,
            suggestedTimeBox: focus.suggested_time_box || '30 minutes',
          }))
        : // Derive from top 5 feature areas by exploratory priority
          featureAreas
            .sort((a, b) => b.exploratoryPriority - a.exploratoryPriority)
            .slice(0, 5)
            .map((area) => ({
              featureArea: area.featureArea,
              displayName: area.displayName,
              exploratoryPriority: area.exploratoryPriority,
              reason: area.riskJustification,
              suggestedTimeBox: '30 minutes',
            }));

    return {
      summary,
      featureAreas: [...featureAreas].sort((a, b) => a.priority - b.priority),
      crossCuttingConcerns: parsed.cross_cutting_concerns || [],
      regressionFocusAreas: parsed.regression_focus_areas || [],
      platformSpecificGuidance: {
        ios: parsed.platform_specific_guidance?.ios || [],
        android: parsed.platform_specific_guidance?.android || [],
        shared: parsed.platform_specific_guidance?.shared || [],
      },
      explorationThemes,
      exploratoryFocusAreas,
      cherryPicks: [], // Will be populated by enrichWithPRTracking if build comparison is used
      reasoning: parsed.reasoning || '',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Generates markdown formatted test plan
 * If cherry-picks exist (build comparison), outputs a focused delta view
 */
function generateMarkdownTestPlan(analysis: GenerateTestPlanAnalysis): string {
  const lines: string[] = [];
  const generatedDate = analysis.generatedAt.split('T')[0];
  const version = analysis.summary.releaseVersion;
  const isDeltaMode = analysis.cherryPicks.length > 0;

  // Delta mode: focused output for build comparison
  if (isDeltaMode) {
    const currentLabel =
      analysis.summary.buildNumber ||
      analysis.summary.toCommit?.substring(0, 7) ||
      'current';
    const previousLabel =
      analysis.summary.previousBuildNumber ||
      analysis.summary.fromCommit?.substring(0, 7) ||
      'previous';

    lines.push(`# 🍒 Build Delta (${previousLabel} → ${currentLabel})`);
    lines.push(`Release ${version} | Generated: ${generatedDate}`);
    lines.push('');

    // Areas needing re-testing
    const areasWithNewChanges = analysis.featureAreas.filter(
      (a) => a.buildChangeInfo.isNewInBuild,
    );

    if (areasWithNewChanges.length > 0) {
      lines.push(`## ${areasWithNewChanges.length} area(s) need re-testing`);
      lines.push('');

      for (const area of areasWithNewChanges) {
        const testedStatus = area.testingStatus.tested ? '✅' : '⏳';
        const testers =
          area.testingStatus.testedBy.length > 0
            ? area.testingStatus.testedBy.join(', ')
            : 'Not assigned';

        lines.push(`### ${area.displayName} ${testedStatus}`);
        lines.push(`**Tested by:** ${testers}`);
        lines.push('');
        lines.push('**Cherry-picks:**');

        // Show cherry-picks for this area
        const areaCherryPicks = analysis.cherryPicks.filter(
          (cp) => cp.featureArea === area.featureArea,
        );
        for (const cp of areaCherryPicks) {
          lines.push(`- ${cp.prNumber || cp.commit}: ${cp.message}`);
        }
        lines.push('');
      }
    } else {
      lines.push('## No areas need re-testing');
      lines.push('');
    }

    // Summary of unchanged areas
    const unchangedAreas = analysis.featureAreas.filter(
      (a) => !a.buildChangeInfo.isNewInBuild,
    );
    if (unchangedAreas.length > 0) {
      lines.push(`## ${unchangedAreas.length} area(s) unchanged`);
      unchangedAreas.forEach((area) => {
        const testedStatus = area.testingStatus.tested ? '✅' : '⏳';
        lines.push(`- ${area.displayName} ${testedStatus}`);
      });
    }

    return lines.join('\n');
  }

  // Full test plan mode (no cherry-picks)
  const title =
    version && version !== 'unknown'
      ? `Mobile Release ${version} Testing Plan`
      : `Mobile Release Testing Plan`;
  lines.push(title);
  lines.push(`Generated: ${generatedDate}`);
  lines.push('');

  // Feature areas (no header, just list areas)
  analysis.featureAreas.forEach((area) => {
    const riskBadge = {
      critical: '`CRITICAL`',
      high: '`HIGH`',
      medium: '`MEDIUM`',
      low: '`LOW`',
    }[area.riskLevel];

    // Use displayName for the header, fallback to featureArea
    const displayName = area.displayName || area.featureArea;
    const exploratoryIndicator = area.exploratoryPriority >= 7 ? ' 🔍' : '';
    lines.push(
      `### ${area.priority}. ${displayName} ${riskBadge}${exploratoryIndicator}`,
    );
    lines.push('');

    // Testing status
    if (area.testingStatus.tested) {
      const testers = area.testingStatus.testedBy.join(', ') || 'Unknown';
      lines.push(`**Tested by:** ${testers} ✅`);
    } else {
      const testers =
        area.testingStatus.testedBy.length > 0
          ? area.testingStatus.testedBy.join(', ')
          : 'Pending';
      lines.push(`**Tested by:** ${testers} ⏳`);
    }

    // Build change info
    if (area.buildChangeInfo.isNewInBuild) {
      const buildNum = area.buildChangeInfo.buildNumber
        ? ` Build ${area.buildChangeInfo.buildNumber}`
        : '';
      const changeType = area.buildChangeInfo.changeType
        ? ` (${area.buildChangeInfo.changeType})`
        : '';
      const relatedPRsText = area.buildChangeInfo.relatedPRs?.length
        ? ` - ${area.buildChangeInfo.relatedPRs.join(', ')}`
        : '';
      lines.push(`**New in${buildNum}:** Yes${changeType}${relatedPRsText}`);
    }
    lines.push('');

    // Exploratory scenarios - just titles
    if (area.exploratoryScenarios.length > 0) {
      lines.push(`**Test Scenarios:**`);
      area.exploratoryScenarios.forEach((scenario) => {
        lines.push(`- ${scenario.title}`);
      });
      lines.push('');
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Outputs analysis results to console and files
 */
export function outputAnalysis(analysis: GenerateTestPlanAnalysis): void {
  const isDeltaMode = analysis.cherryPicks.length > 0;
  const jsonOutputFile = isDeltaMode
    ? 'release-delta.json'
    : 'release-test-plan.json';
  const mdOutputFile = isDeltaMode
    ? 'release-delta.md'
    : 'release-test-plan.md';

  if (isDeltaMode) {
    // Delta mode: focused console output
    const currentLabel =
      analysis.summary.buildNumber ||
      analysis.summary.toCommit?.substring(0, 7) ||
      'current';
    const previousLabel =
      analysis.summary.previousBuildNumber ||
      analysis.summary.fromCommit?.substring(0, 7) ||
      'previous';

    console.log(`\n🍒 Build Delta (${previousLabel} → ${currentLabel})`);
    console.log('===================================');
    console.log(`   Release: ${analysis.summary.releaseVersion}`);
    console.log(`   Cherry-picks: ${analysis.cherryPicks.length}`);

    const areasWithNewChanges = analysis.featureAreas.filter(
      (a) => a.buildChangeInfo.isNewInBuild,
    );
    const unchangedAreas = analysis.featureAreas.filter(
      (a) => !a.buildChangeInfo.isNewInBuild,
    );

    if (areasWithNewChanges.length > 0) {
      console.log(
        `\n🔄 ${areasWithNewChanges.length} area(s) need re-testing:`,
      );
      areasWithNewChanges.forEach((area) => {
        const testedStatus = area.testingStatus.tested ? '✅' : '⏳';
        const testers =
          area.testingStatus.testedBy.length > 0
            ? area.testingStatus.testedBy.join(', ')
            : 'Not assigned';
        console.log(`   - ${area.displayName} ${testedStatus} (${testers})`);
      });
    } else {
      console.log(`\n✅ No areas need re-testing`);
    }

    console.log(`\n📋 ${unchangedAreas.length} area(s) unchanged`);
  } else {
    // Full test plan mode
    console.log('\n📋 Release Test Plan Generator');
    console.log('===================================');
    console.log(`📊 Summary:`);
    console.log(`   Release: ${analysis.summary.releaseVersion}`);
    if (analysis.summary.buildNumber) {
      console.log(`   Build: ${analysis.summary.buildNumber}`);
    }
    console.log(`   Files changed: ${analysis.summary.totalChangedFiles}`);
    console.log(`   Critical areas: ${analysis.summary.criticalAreas}`);
    console.log(`   High risk areas: ${analysis.summary.highRiskAreas}`);
    console.log(`📊 Testing Progress:`);
    console.log(`   Areas tested: ${analysis.summary.areasTestedCount}`);
    console.log(`   Areas not tested: ${analysis.summary.areasNotTestedCount}`);
    console.log(
      `   New in this build: ${analysis.summary.newInThisBuildCount}`,
    );
    console.log(`💭 Reasoning: ${analysis.reasoning}`);

    // Exploratory Focus Summary
    if (analysis.exploratoryFocusAreas.length > 0) {
      console.log('\n🔍 Top Exploratory Testing Focus:');
      analysis.exploratoryFocusAreas.forEach((focus, index) => {
        const bar =
          '█'.repeat(focus.exploratoryPriority) +
          '░'.repeat(10 - focus.exploratoryPriority);
        console.log(
          `   ${index + 1}. ${focus.displayName} [${bar}] ${focus.exploratoryPriority}/10`,
        );
      });
    }

    // Feature areas summary
    console.log('\n🎯 Feature Areas by Priority:');
    analysis.featureAreas.forEach((area, index) => {
      const riskEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      }[area.riskLevel];
      const displayName = area.displayName || area.featureArea;
      const testedStatus = area.testingStatus.tested ? '✅' : '⏳';
      const newInBuild = area.buildChangeInfo.isNewInBuild ? ' 🆕' : '';
      const exploratoryFlag = area.exploratoryPriority >= 7 ? ' 🔍' : '';
      console.log(
        `   ${index + 1}. ${riskEmoji} ${displayName} (${area.riskLevel}) ${testedStatus}${newInBuild}${exploratoryFlag}`,
      );
      console.log(`      Scenarios: ${area.exploratoryScenarios.length}`);
    });
  }

  // Generate markdown output
  const markdown = generateMarkdownTestPlan(analysis);

  // Write outputs
  if (process.env.CI === 'true' || process.env.GENERATE_FILES === 'true') {
    writeFileSync(jsonOutputFile, JSON.stringify(analysis, null, 2));
    writeFileSync(mdOutputFile, markdown);
    console.log(`\n📄 Output written to:`);
    console.log(`   - ${jsonOutputFile}`);
    console.log(`   - ${mdOutputFile}`);
  } else {
    console.log('\n📝 Markdown Preview (first 2000 chars):');
    console.log(markdown.substring(0, 2000));
    if (markdown.length > 2000) {
      console.log('...[truncated]');
    }
    console.log('\n💡 Set GENERATE_FILES=true to write output files');
  }
}
