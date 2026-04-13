import { strings } from '../../../../../../locales/i18n';

// Re-export shared helpers so existing consumers keep working
export {
  formatPercentChange as formatRateOfReturn,
  formatComputedAt,
} from '../../utils/formatUtils';

// ── Tier display names ──────────────────────────────────────────────────

const TIER_I18N_KEYS: Record<string, string> = {
  STARTER: 'rewards.ondo_campaign_leaderboard.tier_starter',
  MID: 'rewards.ondo_campaign_leaderboard.tier_mid',
  UPPER: 'rewards.ondo_campaign_leaderboard.tier_upper',
};

/**
 * Maps an API tier key (e.g. 'STARTER') to its localized display name.
 * Returns the raw key when no mapping is found.
 */
export const formatTierDisplayName = (tier: string): string => {
  const key = TIER_I18N_KEYS[tier];
  return key ? strings(key) : tier;
};
