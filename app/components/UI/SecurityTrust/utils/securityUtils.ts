import {
  IconColor,
  IconName,
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
  icon?: IconName;
  iconColor?: IconColor;
}

export interface SecurityBadgeConfig {
  icon: IconName;
  iconColor: IconColor;
  label: string | null;
  bg: string | null;
  textColor: TextColor | undefined;
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
      };
    case 'Benign':
      return {
        label: strings('security_trust.no_issues'),
        textColor: TextColor.SuccessDefault,
        subtitle: strings('security_trust.subtitle_no_issues'),
        icon: IconName.SecurityTick,
        iconColor: IconColor.SuccessDefault,
      };
    case 'Warning':
    case 'Spam':
      return {
        label: strings('security_trust.suspicious'),
        textColor: TextColor.WarningDefault,
        subtitle: strings('security_trust.subtitle_suspicious'),
        icon: IconName.Warning,
        iconColor: IconColor.WarningDefault,
      };
    case 'Malicious':
      return {
        label: strings('security_trust.malicious_label'),
        textColor: TextColor.ErrorDefault,
        subtitle: strings('security_trust.subtitle_malicious'),
        icon: IconName.Danger,
        iconColor: IconColor.ErrorDefault,
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
const POSITIVE_FEATURE_LABELS: Record<string, FeatureDefinition> = {
  HIGH_REPUTATION_TOKEN: { label: 'Established reputation', type: 'Benign' },
  LISTED_ON_CENTRALIZED_EXCHANGE: {
    label: 'Listed on exchange',
    type: 'Benign',
  },
  VERIFIED_CONTRACT: { label: 'Published contract', type: 'Info' },
  HIGH_TRADE_VOLUME: { label: 'High trading volume', type: 'Info' },
};

/** Negative-signal features (Malicious / Spam / Warning / risk-bearing Info) */
const NEGATIVE_FEATURE_LABELS: Record<string, FeatureDefinition> = {
  // Malicious
  KNOWN_MALICIOUS: { label: 'Known malicious', type: 'Malicious' },
  METADATA: { label: 'Suspicious metadata', type: 'Malicious' },
  IMPERSONATOR_SENSITIVE_ASSET: {
    label: 'Impersonates a sensitive asset',
    type: 'Malicious',
  },
  STATIC_CODE_SIGNATURE: { label: 'Suspicious code', type: 'Malicious' },
  RUGPULL: { label: 'Rugpull risk', type: 'Malicious' },
  HIGH_TRANSFER_FEE: { label: 'High transfer fee', type: 'Malicious' },
  HIGH_BUY_FEE: { label: 'High buy fee', type: 'Malicious' },
  HIGH_SELL_FEE: { label: 'High sell fee', type: 'Malicious' },
  UNSELLABLE_TOKEN: { label: 'Unsellable token', type: 'Malicious' },
  SANCTIONED_CREATOR: { label: 'Sanctioned creator', type: 'Malicious' },
  SIMILAR_MALICIOUS_CONTRACT: {
    label: 'Resembles malicious contract',
    type: 'Malicious',
  },
  TOKEN_BACKDOOR: { label: 'Token backdoor', type: 'Malicious' },
  POST_DUMP: { label: 'Possible price manipulation', type: 'Malicious' },

  // Spam
  IMPERSONATOR_HIGH_CONFIDENCE: { label: 'Likely impersonator', type: 'Spam' },
  IMPERSONATOR_MEDIUM_CONFIDENCE: {
    label: 'Possible impersonator',
    type: 'Spam',
  },

  // Warning
  AIRDROP_PATTERN: { label: 'Suspicious airdrop', type: 'Warning' },
  IMPERSONATOR: { label: 'Impersonator', type: 'Warning' },
  INORGANIC_VOLUME: { label: 'Artificial volume', type: 'Warning' },
  DYNAMIC_ANALYSIS: { label: 'Suspicious behavior', type: 'Warning' },
  UNSTABLE_TOKEN_PRICE: { label: 'Unstable price', type: 'Warning' },
  INAPPROPRIATE_CONTENT: { label: 'Inappropriate content', type: 'Warning' },
  HONEYPOT: { label: 'Honeypot risk', type: 'Warning' },
  SPAM_TEXT: { label: 'Spam text', type: 'Warning' },
  INSUFFICIENT_LOCKED_LIQUIDITY: {
    label: 'Low locked liquidity',
    type: 'Warning',
  },
  CONCENTRATED_SUPPLY_DISTRIBUTION: {
    label: 'Concentrated supply',
    type: 'Warning',
  },
  WASH_TRADING: { label: 'Wash trading', type: 'Warning' },
  FAKE_VOLUME: { label: 'Fake volume', type: 'Warning' },
  HIDDEN_SUPPLY_BY_KEY_HOLDER: { label: 'Undisclosed supply', type: 'Warning' },
  HEAVILY_SNIPED: { label: 'Heavy bot activity', type: 'Warning' },
  FAKE_TRADE_MAKER_COUNT: { label: 'Inflated trader count', type: 'Warning' },
  LOW_REPUTATION_CREATOR: {
    label: 'Creator has low reputation',
    type: 'Warning',
  },
  SNIPE_AT_MINT: { label: 'Bot activity at launch', type: 'Warning' },

  // Info – risk-bearing capabilities
  IMPERSONATOR_LOW_CONFIDENCE: {
    label: 'Unconfirmed impersonator',
    type: 'Warning',
  }, // used to be Info, but now it's Warning
  IS_MINTABLE: { label: 'Mintable', type: 'Info' },
  CAN_BLACKLIST: { label: 'Can blacklist', type: 'Info' },
  CAN_WHITELIST: { label: 'Can whitelist', type: 'Info' },
  HAS_TRADING_COOLDOWN: { label: 'Trading cooldown', type: 'Info' },
  EXTERNAL_FUNCTIONS: { label: 'External calls', type: 'Info' },
  HIDDEN_OWNER: { label: 'Hidden owner', type: 'Info' },
  TRANSFER_PAUSEABLE: { label: 'Transfers pauseable', type: 'Info' },
  PROXY_CONTRACT: { label: 'Proxy contract', type: 'Info' },
  MODIFIABLE_TAXES: { label: 'Modifiable taxes', type: 'Info' },
  OWNER_CAN_CHANGE_BALANCE: { label: 'Owner can change balance', type: 'Info' },
  TRANSFER_FROM_REVERTS: { label: 'Transfer reversals enabled', type: 'Info' },
  TRANSFER_HOOK_ENABLED: { label: 'Transfer hook enabled', type: 'Info' },
  CONFIDENTIAL_TRANSFERS_ENABLED: {
    label: 'Confidential transfers',
    type: 'Info',
  },
  NON_TRANSERABLE: { label: 'Non-transferable', type: 'Info' },
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
 * Get security badge configuration based on security data result type.
 * Returns null for Benign tokens (no badge needed).
 */
export const getSecurityBadgeConfig = (
  securityData: TokenSecurityData | null | undefined,
): SecurityBadgeConfig | null => {
  switch (securityData?.resultType) {
    case 'Verified':
      return {
        icon: IconName.VerifiedFilled,
        iconColor: IconColor.PrimaryDefault,
        label: null,
        bg: null,
        textColor: undefined,
      };
    case 'Benign':
      return null;
    case 'Warning':
    case 'Spam':
      return {
        icon: IconName.Warning,
        iconColor: IconColor.WarningDefault,
        label: strings('security_trust.risky'),
        bg: 'bg-warning-muted',
        textColor: TextColor.WarningDefault,
      };
    case 'Malicious':
      return {
        icon: IconName.Danger,
        iconColor: IconColor.ErrorDefault,
        label: strings('security_trust.malicious'),
        bg: 'bg-error-muted',
        textColor: TextColor.ErrorDefault,
      };
    default:
      return null;
  }
};
