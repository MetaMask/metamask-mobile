import {
  IconColor,
  IconName,
  IconAlertSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  type FeatureTag,
  type TokenSecurityData,
  type TokenSecurityFeature,
  type TokenSecurityFinancialStats,
} from '../types';
import { strings } from '../../../../../locales/i18n';

export interface ResultTypeConfig {
  label: string;
  textColor: TextColor;
  subtitle?: string;
  /** Feature tag icon (used in SecurityTrustScreen, SecurityTrustEntryCard) */
  icon?: IconName;
  iconColor?: IconColor;
  iconAlertSeverity?: IconAlertSeverity;
  /** Inline badge configuration (used in TrendingTokenRowItem, AssetOverviewContent). null = no inline badge */
  badge?: {
    icon: IconName;
    iconColor: IconColor;
    iconAlertSeverity?: IconAlertSeverity;
    label: string | null;
    bg: string | null;
    textColor?: TextColor;
  } | null;
  /** Title for bottom sheet display */
  sheetTitle?: string;
  /** Description for bottom sheet display (may include token symbol placeholder) */
  getSheetDescription?: (tokenSymbol: string) => string;
}

export const getResultTypeConfig = (
  resultType: string | undefined,
): ResultTypeConfig => {
  switch (resultType) {
    case 'Verified':
      return {
        label: strings('security_trust.verified'),
        textColor: TextColor.SuccessDefault,
        subtitle: strings('security_trust.subtitle_known'),
        icon: IconName.SecurityTick,
        iconColor: IconColor.SuccessDefault,
        iconAlertSeverity: IconAlertSeverity.Success,
        badge: {
          icon: IconName.VerifiedFilled,
          iconColor: IconColor.PrimaryDefault,
          iconAlertSeverity: undefined,
          label: null,
          bg: null,
          textColor: undefined,
        },
        sheetTitle: strings('security_trust.verified_token_title'),
        getSheetDescription: (symbol) =>
          strings('security_trust.verified_token_description', { symbol }),
      };
    case 'Benign':
      return {
        label: strings('security_trust.no_issues'),
        textColor: TextColor.SuccessDefault,
        subtitle: strings('security_trust.subtitle_no_issues'),
        icon: IconName.SecurityTick,
        iconColor: IconColor.SuccessDefault,
        iconAlertSeverity: IconAlertSeverity.Success,
        badge: null,
      };
    case 'Warning':
    case 'Spam':
      return {
        label: strings('security_trust.suspicious'),
        textColor: TextColor.WarningDefault,
        subtitle: strings('security_trust.subtitle_suspicious'),
        icon: IconName.Warning,
        iconColor: IconColor.WarningDefault,
        iconAlertSeverity: IconAlertSeverity.Warning,
        badge: {
          icon: IconName.Warning,
          iconColor: IconColor.WarningDefault,
          iconAlertSeverity: IconAlertSeverity.Warning,
          label: strings('security_trust.risky'),
          bg: 'bg-warning-muted',
          textColor: TextColor.WarningDefault,
        },
        sheetTitle: strings('security_trust.risky_token_title'),
        getSheetDescription: (symbol) =>
          strings('security_trust.risky_token_description', { symbol }),
      };
    case 'Malicious':
      return {
        label: strings('security_trust.malicious_label'),
        textColor: TextColor.ErrorDefault,
        subtitle: strings('security_trust.subtitle_malicious'),
        icon: IconName.Error,
        iconColor: IconColor.ErrorDefault,
        iconAlertSeverity: IconAlertSeverity.Error,
        badge: {
          icon: IconName.Danger,
          iconColor: IconColor.ErrorDefault,
          iconAlertSeverity: IconAlertSeverity.Error,
          label: strings('security_trust.malicious'),
          bg: 'bg-error-muted',
          textColor: TextColor.ErrorDefault,
        },
        sheetTitle: strings('security_trust.malicious_token_title'),
        getSheetDescription: (symbol) =>
          strings('security_trust.malicious_token_sheet_description', {
            symbol,
          }),
      };
    default:
      return {
        label: strings('security_trust.data_unavailable'),
        textColor: TextColor.TextAlternative,
        subtitle: strings('security_trust.subtitle_unavailable'),
      };
  }
};

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
const getPositiveFeatureLabels = (): Record<string, FeatureDefinition> => ({
  HIGH_REPUTATION_TOKEN: {
    label: strings('security_trust.features.positive.high_reputation_token'),
    type: 'Benign',
  },
  LISTED_ON_CENTRALIZED_EXCHANGE: {
    label: strings(
      'security_trust.features.positive.listed_on_centralized_exchange',
    ),
    type: 'Benign',
  },
  VERIFIED_CONTRACT: {
    label: strings('security_trust.features.positive.verified_contract'),
    type: 'Info',
  },
  HIGH_TRADE_VOLUME: {
    label: strings('security_trust.features.positive.high_trade_volume'),
    type: 'Info',
  },
});

/** Negative-signal features (Malicious / Spam / Warning / risk-bearing Info) */
export const getNegativeFeatureLabels = (): Record<
  string,
  FeatureDefinition
> => ({
  // Malicious
  KNOWN_MALICIOUS: {
    label: strings('security_trust.features.negative.known_malicious'),
    type: 'Malicious',
  },
  METADATA: {
    label: strings('security_trust.features.negative.metadata'),
    type: 'Malicious',
  },
  IMPERSONATOR_SENSITIVE_ASSET: {
    label: strings(
      'security_trust.features.negative.impersonator_sensitive_asset',
    ),
    type: 'Malicious',
  },
  STATIC_CODE_SIGNATURE: {
    label: strings('security_trust.features.negative.static_code_signature'),
    type: 'Malicious',
  },
  RUGPULL: {
    label: strings('security_trust.features.negative.rugpull'),
    type: 'Malicious',
  },
  HIGH_TRANSFER_FEE: {
    label: strings('security_trust.features.negative.high_transfer_fee'),
    type: 'Malicious',
  },
  HIGH_BUY_FEE: {
    label: strings('security_trust.features.negative.high_buy_fee'),
    type: 'Malicious',
  },
  HIGH_SELL_FEE: {
    label: strings('security_trust.features.negative.high_sell_fee'),
    type: 'Malicious',
  },
  UNSELLABLE_TOKEN: {
    label: strings('security_trust.features.negative.unsellable_token'),
    type: 'Malicious',
  },
  SANCTIONED_CREATOR: {
    label: strings('security_trust.features.negative.sanctioned_creator'),
    type: 'Malicious',
  },
  SIMILAR_MALICIOUS_CONTRACT: {
    label: strings(
      'security_trust.features.negative.similar_malicious_contract',
    ),
    type: 'Malicious',
  },
  TOKEN_BACKDOOR: {
    label: strings('security_trust.features.negative.token_backdoor'),
    type: 'Malicious',
  },
  POST_DUMP: {
    label: strings('security_trust.features.negative.post_dump'),
    type: 'Malicious',
  },

  // Spam
  IMPERSONATOR_HIGH_CONFIDENCE: {
    label: strings(
      'security_trust.features.negative.impersonator_high_confidence',
    ),
    type: 'Spam',
  },
  IMPERSONATOR_MEDIUM_CONFIDENCE: {
    label: strings(
      'security_trust.features.negative.impersonator_medium_confidence',
    ),
    type: 'Spam',
  },

  // Warning
  AIRDROP_PATTERN: {
    label: strings('security_trust.features.negative.airdrop_pattern'),
    type: 'Warning',
  },
  IMPERSONATOR: {
    label: strings('security_trust.features.negative.impersonator'),
    type: 'Warning',
  },
  INORGANIC_VOLUME: {
    label: strings('security_trust.features.negative.inorganic_volume'),
    type: 'Warning',
  },
  DYNAMIC_ANALYSIS: {
    label: strings('security_trust.features.negative.dynamic_analysis'),
    type: 'Warning',
  },
  UNSTABLE_TOKEN_PRICE: {
    label: strings('security_trust.features.negative.unstable_token_price'),
    type: 'Warning',
  },
  INAPPROPRIATE_CONTENT: {
    label: strings('security_trust.features.negative.inappropriate_content'),
    type: 'Warning',
  },
  HONEYPOT: {
    label: strings('security_trust.features.negative.honeypot'),
    type: 'Warning',
  },
  SPAM_TEXT: {
    label: strings('security_trust.features.negative.spam_text'),
    type: 'Warning',
  },
  INSUFFICIENT_LOCKED_LIQUIDITY: {
    label: strings(
      'security_trust.features.negative.insufficient_locked_liquidity',
    ),
    type: 'Warning',
  },
  CONCENTRATED_SUPPLY_DISTRIBUTION: {
    label: strings(
      'security_trust.features.negative.concentrated_supply_distribution',
    ),
    type: 'Warning',
  },
  WASH_TRADING: {
    label: strings('security_trust.features.negative.wash_trading'),
    type: 'Warning',
  },
  FAKE_VOLUME: {
    label: strings('security_trust.features.negative.fake_volume'),
    type: 'Warning',
  },
  HIDDEN_SUPPLY_BY_KEY_HOLDER: {
    label: strings(
      'security_trust.features.negative.hidden_supply_by_key_holder',
    ),
    type: 'Warning',
  },
  HEAVILY_SNIPED: {
    label: strings('security_trust.features.negative.heavily_sniped'),
    type: 'Warning',
  },
  FAKE_TRADE_MAKER_COUNT: {
    label: strings('security_trust.features.negative.fake_trade_maker_count'),
    type: 'Warning',
  },
  LOW_REPUTATION_CREATOR: {
    label: strings('security_trust.features.negative.low_reputation_creator'),
    type: 'Warning',
  },
  SNIPE_AT_MINT: {
    label: strings('security_trust.features.negative.snipe_at_mint'),
    type: 'Warning',
  },

  // Info – risk-bearing capabilities
  IMPERSONATOR_LOW_CONFIDENCE: {
    label: strings(
      'security_trust.features.negative.impersonator_low_confidence',
    ),
    type: 'Warning',
  }, // used to be Info, but now it's Warning
  IS_MINTABLE: {
    label: strings('security_trust.features.negative.is_mintable'),
    type: 'Info',
  },
  CAN_BLACKLIST: {
    label: strings('security_trust.features.negative.can_blacklist'),
    type: 'Info',
  },
  CAN_WHITELIST: {
    label: strings('security_trust.features.negative.can_whitelist'),
    type: 'Info',
  },
  HAS_TRADING_COOLDOWN: {
    label: strings('security_trust.features.negative.has_trading_cooldown'),
    type: 'Info',
  },
  EXTERNAL_FUNCTIONS: {
    label: strings('security_trust.features.negative.external_functions'),
    type: 'Info',
  },
  HIDDEN_OWNER: {
    label: strings('security_trust.features.negative.hidden_owner'),
    type: 'Info',
  },
  TRANSFER_PAUSEABLE: {
    label: strings('security_trust.features.negative.transfer_pauseable'),
    type: 'Info',
  },
  PROXY_CONTRACT: {
    label: strings('security_trust.features.negative.proxy_contract'),
    type: 'Info',
  },
  MODIFIABLE_TAXES: {
    label: strings('security_trust.features.negative.modifiable_taxes'),
    type: 'Info',
  },
  OWNER_CAN_CHANGE_BALANCE: {
    label: strings('security_trust.features.negative.owner_can_change_balance'),
    type: 'Info',
  },
  TRANSFER_FROM_REVERTS: {
    label: strings('security_trust.features.negative.transfer_from_reverts'),
    type: 'Info',
  },
  TRANSFER_HOOK_ENABLED: {
    label: strings('security_trust.features.negative.transfer_hook_enabled'),
    type: 'Info',
  },
  CONFIDENTIAL_TRANSFERS_ENABLED: {
    label: strings(
      'security_trust.features.negative.confidential_transfers_enabled',
    ),
    type: 'Info',
  },
  NON_TRANSERABLE: {
    label: strings('security_trust.features.negative.non_transerable'),
    type: 'Info',
  },
});

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
    const negativeLabels = getNegativeFeatureLabels();
    for (const feature of features) {
      const def = negativeLabels[feature.featureId];
      if (def?.type === 'Malicious') {
        totalMatching++;
        if (showAll || tags.length < FEATURE_TAG_DISPLAY_MAX) {
          tags.push({ label: def.label });
        }
      }
    }
  } else if (resultType === 'Warning' || resultType === 'Spam') {
    const negativeLabels = getNegativeFeatureLabels();
    for (const feature of features) {
      const def = negativeLabels[feature.featureId];
      if (def?.type === 'Warning' || def?.type === 'Spam') {
        totalMatching++;
        if (showAll || tags.length < FEATURE_TAG_DISPLAY_MAX) {
          tags.push({ label: def.label });
        }
      }
    }
  } else {
    // Low (Verified/Benign) or no resultType: positive features only
    const positiveLabels = getPositiveFeatureLabels();
    for (const feature of features) {
      const def = positiveLabels[feature.featureId];
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
