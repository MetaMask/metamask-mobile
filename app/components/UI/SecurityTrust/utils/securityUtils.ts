import {
  RiskLevel,
  type FeatureTag,
  type TokenSecurityData,
  type TokenSecurityFeature,
  type TokenSecurityFees,
  type TokenSecurityFinancialStats,
} from '../types';

/** Map featureId to a human-readable positive label */
const POSITIVE_FEATURE_LABELS: Record<string, string> = {
  VERIFIED_CONTRACT: 'Verified Contract',
  HIGH_REPUTATION_TOKEN: 'High Reputation',
  LISTED_ON_CENTRALIZED_EXCHANGE: 'Listed on CEX',
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

/**
 * Returns up to `max` feature tags for the entry card summary.
 */
export const getFeatureTags = (
  features: TokenSecurityFeature[],
  fees: TokenSecurityFees | null | undefined,
  max = 4,
): FeatureTag[] => {
  const tags: FeatureTag[] = [];

  // Positive tags from known positive feature IDs
  for (const feature of features) {
    if (POSITIVE_FEATURE_LABELS[feature.featureId]) {
      tags.push({
        label: POSITIVE_FEATURE_LABELS[feature.featureId],
        isPositive: true,
      });
    }
    if (tags.length >= max) return tags;
  }

  // "0% Buy/Sell Tax" if fees are all 0
  const hasZeroFees =
    fees != null && fees.buy === 0 && fees.sell === 0 && fees.transfer === 0;
  if (hasZeroFees && tags.length < max) {
    tags.push({ label: '0% Buy/Sell Tax', isPositive: true });
  }

  return tags.slice(0, max);
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

export { POSITIVE_FEATURE_LABELS };
