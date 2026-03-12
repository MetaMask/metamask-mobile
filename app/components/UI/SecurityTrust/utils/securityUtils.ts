import {
  RiskLevel,
  type FeatureTag,
  type TokenSecurityData,
  type TokenSecurityFeature,
  type TokenSecurityFinancialStats,
} from '../types';

/** Blockaid-assigned feature type, as documented in the Blockaid token-scan API. */
export type BlockaidFeatureType =
  | 'Benign'
  | 'Info'
  | 'Warning'
  | 'Spam'
  | 'Malicious';

interface FeatureDefinition {
  label: string;
  type: BlockaidFeatureType;
}

/** Positive-signal features (Benign / Info) */
const POSITIVE_FEATURE_LABELS: Record<string, FeatureDefinition> = {
  HIGH_REPUTATION_TOKEN: { label: 'High Reputation', type: 'Benign' },
  LISTED_ON_CENTRALIZED_EXCHANGE: { label: 'Listed on CEX', type: 'Benign' },
  VERIFIED_CONTRACT: { label: 'Verified Contract', type: 'Info' },
  HIGH_TRADE_VOLUME: { label: 'High Trade Volume', type: 'Info' },
};

/** Negative-signal features (Malicious / Spam / Warning / risk-bearing Info) */
const NEGATIVE_FEATURE_LABELS: Record<string, FeatureDefinition> = {
  // Malicious
  KNOWN_MALICIOUS: { label: 'Known Malicious', type: 'Malicious' },
  METADATA: { label: 'Suspicious Metadata', type: 'Malicious' },
  IMPERSONATOR_SENSITIVE_ASSET: {
    label: 'Sensitive Asset Impersonator',
    type: 'Malicious',
  },
  STATIC_CODE_SIGNATURE: { label: 'Suspicious Code', type: 'Malicious' },
  RUGPULL: { label: 'Rugpull Risk', type: 'Malicious' },
  HIGH_TRANSFER_FEE: { label: 'High Transfer Fee', type: 'Malicious' },
  HIGH_BUY_FEE: { label: 'High Buy Fee', type: 'Malicious' },
  HIGH_SELL_FEE: { label: 'High Sell Fee', type: 'Malicious' },
  UNSELLABLE_TOKEN: { label: 'Unsellable Token', type: 'Malicious' },
  SANCTIONED_CREATOR: { label: 'Sanctioned Creator', type: 'Malicious' },
  SIMILAR_MALICIOUS_CONTRACT: {
    label: 'Similar Malicious Contract',
    type: 'Malicious',
  },
  TOKEN_BACKDOOR: { label: 'Token Backdoor', type: 'Malicious' },
  POST_DUMP: { label: 'Post Dump', type: 'Malicious' },

  // Spam
  IMPERSONATOR_HIGH_CONFIDENCE: { label: 'Impersonator (High)', type: 'Spam' },
  IMPERSONATOR_MEDIUM_CONFIDENCE: {
    label: 'Impersonator (Medium)',
    type: 'Spam',
  },

  // Warning
  AIRDROP_PATTERN: { label: 'Suspicious Airdrop', type: 'Warning' },
  IMPERSONATOR: { label: 'Impersonator', type: 'Warning' },
  INORGANIC_VOLUME: { label: 'Inorganic Volume', type: 'Warning' },
  DYNAMIC_ANALYSIS: { label: 'Suspicious Behavior', type: 'Warning' },
  UNSTABLE_TOKEN_PRICE: { label: 'Unstable Price', type: 'Warning' },
  INAPPROPRIATE_CONTENT: { label: 'Inappropriate Content', type: 'Warning' },
  HONEYPOT: { label: 'Honeypot Risk', type: 'Warning' },
  SPAM_TEXT: { label: 'Spam Text', type: 'Warning' },
  INSUFFICIENT_LOCKED_LIQUIDITY: {
    label: 'Insufficient Locked Liquidity',
    type: 'Warning',
  },
  CONCENTRATED_SUPPLY_DISTRIBUTION: {
    label: 'Concentrated Supply',
    type: 'Warning',
  },
  WASH_TRADING: { label: 'Wash Trading', type: 'Warning' },
  FAKE_VOLUME: { label: 'Fake Volume', type: 'Warning' },
  HIDDEN_SUPPLY_BY_KEY_HOLDER: { label: 'Hidden Supply', type: 'Warning' },
  HEAVILY_SNIPED: { label: 'Heavily Sniped', type: 'Warning' },
  FAKE_TRADE_MAKER_COUNT: { label: 'Fake Maker Count', type: 'Warning' },
  LOW_REPUTATION_CREATOR: { label: 'Low Reputation Creator', type: 'Warning' },
  SNIPE_AT_MINT: { label: 'Sniped at Mint', type: 'Warning' },

  // Info – risk-bearing capabilities
  IMPERSONATOR_LOW_CONFIDENCE: { label: 'Impersonator (Low)', type: 'Info' },
  IS_MINTABLE: { label: 'Mintable', type: 'Info' },
  CAN_BLACKLIST: { label: 'Can Blacklist', type: 'Info' },
  CAN_WHITELIST: { label: 'Can Whitelist', type: 'Info' },
  HAS_TRADING_COOLDOWN: { label: 'Trading Cooldown', type: 'Info' },
  EXTERNAL_FUNCTIONS: { label: 'External Calls', type: 'Info' },
  HIDDEN_OWNER: { label: 'Hidden Owner', type: 'Info' },
  TRANSFER_PAUSEABLE: { label: 'Transfers Pauseable', type: 'Info' },
  PROXY_CONTRACT: { label: 'Proxy Contract', type: 'Info' },
  MODIFIABLE_TAXES: { label: 'Modifiable Taxes', type: 'Info' },
  OWNER_CAN_CHANGE_BALANCE: { label: 'Owner Can Change Balance', type: 'Info' },
  TRANSFER_FROM_REVERTS: { label: 'TransferFrom Reverts', type: 'Info' },
  TRANSFER_HOOK_ENABLED: { label: 'Transfer Hook Enabled', type: 'Info' },
  CONFIDENTIAL_TRANSFERS_ENABLED: {
    label: 'Confidential Transfers',
    type: 'Info',
  },
  NON_TRANSERABLE: { label: 'Non-Transferable', type: 'Info' },
};

/**
 * Derive an overall risk level from securityData.
 */
export const getRiskLevel = (
  resultType: TokenSecurityData['resultType'] | undefined,
): RiskLevel => {
  switch (resultType) {
    case 'Verified':
    case 'Benign':
      return RiskLevel.Low;
    case 'Warning':
    case 'Spam':
      return RiskLevel.Medium;
    case 'Malicious':
      return RiskLevel.High;
    default:
      return RiskLevel.Unknown;
  }
};

export interface FeatureTagsResult {
  tags: FeatureTag[];
  remainingCount: number;
}

const FEATURE_TAG_DISPLAY_MAX = 3;
const POSITIVE_FEATURE_TAG_DISPLAY_MAX = 4;

/**
 * Returns up to 3 feature tags for the entry card, filtered by resultType,
 * plus a count of additional matching features beyond the display limit.
 *
 * - Low (Verified/Benign): positive features only, no remainingCount.
 * - Medium (Warning/Spam): Warning + Spam negative features, with overflow count.
 * - High (Malicious): Malicious negative features, with overflow count.
 */
export const getFeatureTags = (
  features: TokenSecurityFeature[],
  resultType?: TokenSecurityData['resultType'],
  showAll = false,
): FeatureTagsResult => {
  const tags: FeatureTag[] = [];
  let totalMatching = 0;

  if (resultType === 'Malicious') {
    for (const feature of features) {
      const def = NEGATIVE_FEATURE_LABELS[feature.featureId];
      if (def?.type === 'Malicious') {
        totalMatching++;
        if (showAll || tags.length < FEATURE_TAG_DISPLAY_MAX) {
          tags.push({ label: def.label });
        }
      }
    }
  } else if (resultType === 'Warning' || resultType === 'Spam') {
    for (const feature of features) {
      const def = NEGATIVE_FEATURE_LABELS[feature.featureId];
      if (def?.type === 'Warning' || def?.type === 'Spam') {
        totalMatching++;
        if (showAll || tags.length < FEATURE_TAG_DISPLAY_MAX) {
          tags.push({ label: def.label });
        }
      }
    }
  } else {
    // Low (Verified/Benign) or no resultType: positive features only
    for (const feature of features) {
      const def = POSITIVE_FEATURE_LABELS[feature.featureId];
      if (def) {
        if (showAll || tags.length < POSITIVE_FEATURE_TAG_DISPLAY_MAX) {
          tags.push({ label: def.label });
        }
      }
    }
    return { tags, remainingCount: 0 };
  }

  return {
    tags,
    remainingCount: showAll
      ? 0
      : Math.max(0, totalMatching - FEATURE_TAG_DISPLAY_MAX),
  };
};

/**
 * Format a fee value (0-100 range) as a percentage string, or "N/A" if null.
 */
export const formatFeePercent = (fee: number | null | undefined): string => {
  if (fee === null || fee === undefined) return 'N/A';
  return `${fee.toFixed(1)}%`;
};

/**
 * Sum the holding percentages of top holders.
 */
export const getTop10HoldingPct = (
  financialStats: TokenSecurityFinancialStats | null | undefined,
): number | null => {
  if (!financialStats?.topHolders?.length) return null;
  const sum = financialStats.topHolders.reduce(
    (acc, h) => acc + (h.holdingPercentage ?? 0),
    0,
  );
  return Math.min(sum, 100);
};

/**
 * Sum all market reserve USD values.
 */
export const getTotalLiquidityUSD = (
  financialStats: TokenSecurityFinancialStats | null | undefined,
): number | null => {
  if (!financialStats?.markets?.length) return null;
  return financialStats.markets.reduce(
    (acc, m) => acc + (m.reserveUSD ?? 0),
    0,
  );
};

/**
 * Format a large USD number to a compact string, e.g. $1.23M or $456K.
 */
export const formatCompactUSD = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
};

/**
 * Format a raw token supply number to a compact string with unit.
 */
export const formatCompactSupply = (
  supply: number | null | undefined,
  decimals?: number,
): string => {
  if (supply === null || supply === undefined) return 'N/A';
  const adjusted =
    decimals != null && decimals > 0 ? supply / 10 ** decimals : supply;
  const units: [number, string][] = [
    [1e15, 'Q'],
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [threshold, suffix] of units) {
    if (adjusted >= threshold) {
      return `${(adjusted / threshold).toFixed(2)}${suffix}`;
    }
  }
  return adjusted.toFixed(0);
};

/**
 * Derive whale concentration risk level from top 10 holder percentage.
 */
export const getWhaleConcentrationRisk = (
  top10Pct: number | null,
): RiskLevel => {
  if (top10Pct === null) return RiskLevel.Unknown;
  if (top10Pct < 20) return RiskLevel.Low;
  if (top10Pct <= 50) return RiskLevel.Medium;
  return RiskLevel.High;
};

/**
 * Check if a featureId is present in the features array.
 */
export const hasFeature = (
  features: TokenSecurityFeature[],
  featureId: string,
): boolean => features.some((f) => f.featureId === featureId);

/**
 * Derive a "smart contract risk" label from resultType.
 */
export const getSmartContractRisk = (
  resultType: TokenSecurityData['resultType'] | undefined,
): RiskLevel => {
  switch (resultType) {
    case 'Verified':
    case 'Benign':
      return RiskLevel.Low;
    case 'Warning':
      return RiskLevel.Medium;
    case 'Malicious':
      return RiskLevel.High;
    default:
      return RiskLevel.Unknown;
  }
};

export { POSITIVE_FEATURE_LABELS, NEGATIVE_FEATURE_LABELS };
