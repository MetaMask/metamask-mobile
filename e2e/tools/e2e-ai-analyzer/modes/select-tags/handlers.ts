/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { writeFileSync } from 'node:fs';
import { SelectTagsAnalysis } from '../../types';

// TODO to review!!
export const SELECT_TAGS_CONFIG = [
  { tag: 'SmokeAccounts', description: 'Multi-account, account management' },
  {
    tag: 'SmokeConfirmationsRedesigned',
    description:
      'Confirmation flows (redesign), signature requests, transaction approval',
  },
  {
    tag: 'SmokeCore',
    description:
      'Wallet creation, network switching, send/receive, core wallet',
  },
  {
    tag: 'SmokeSwaps',
    description: 'Swaps, token exchange, DEX integration',
  },
  {
    tag: 'SmokeAssets',
    description: 'Token imports, NFT viewing, asset management',
  },
  {
    tag: 'SmokeIdentity',
    description: 'Permissions, DApp connections, account switching in DApps',
  },
  {
    tag: 'SmokeTrade',
    description: 'Trading features, market data',
  },
  {
    tag: 'SmokeWalletUX',
    description: 'UX improvements, navigation, settings, UI components',
  },
  {
    tag: 'SmokeNetworkAbstractions',
    description: 'Network abstractions, multi-chain support',
  },
  {
    tag: 'SmokeWalletPlatform',
    description: 'Wallet platform features',
  },
  {
    tag: 'SmokeNetworkExpansion',
    description: 'Network expansion features',
  },
  {
    tag: 'SmokeStake',
    description: 'Staking features',
  },
  {
    tag: 'SmokeNotifications',
    description: 'Notifications, alerts',
  },
  {
    tag: 'SmokeCard',
    description: 'Card features',
  },
];

/**
 * Safe minimum: When no work needed, return empty result
 */
export function createEmptyResult(): SelectTagsAnalysis {
  return {
    selectedTags: ['None (no tests recommended)'],
    confidence: 100,
    riskLevel: 'low',
    reasoning: 'No files changed - no analysis needed',
  };
}

/**
 * Processes analysis results from the AI (middle case - normal operation)
 */
export async function processAnalysis(
  analysis: SelectTagsAnalysis,
  _baseDir: string,
): Promise<SelectTagsAnalysis> {
  return analysis;
}

/**
 * Safe maximum: When AI fails, be conservative - i.e. run all tags
 */
export function createConservativeResult(): SelectTagsAnalysis {
  const availableTags = SELECT_TAGS_CONFIG.map((config) => config.tag);
  return {
    selectedTags: availableTags,
    riskLevel: 'high',
    confidence: 0,
    reasoning:
      'Fallback: AI analysis did not complete successfully. Running all tests.',
  };
}

/**
 * Outputs analysis results to both JSON file and console
 */
export function outputAnalysis(analysis: SelectTagsAnalysis): void {
  const outputFile = 'e2e-ai-analysis.json';

  console.log('\n🤖 AI E2E Tag Selector');
  console.log('===================================');
  console.log(`✅ Selected E2E tags: ${analysis.selectedTags.join(', ')}`);
  console.log(`🎯 Risk level: ${analysis.riskLevel}`);
  console.log(`📊 Confidence: ${analysis.confidence}%`);
  console.log(`💭 Reasoning: ${analysis.reasoning}`);

  // If running in CI, write the results to a JSON file
  if (process.env.CI === 'true') {
    const jsonOutput = {
      selectedTags: analysis.selectedTags,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
    };
    writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  }
}
