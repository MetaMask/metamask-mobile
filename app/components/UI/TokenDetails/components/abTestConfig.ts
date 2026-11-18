import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';
import { COMPONENT_NAMES } from '../../Money/constants/moneyEventLocations';
import { STABLECOIN_TOKEN_SYMBOLS } from '../../Money/constants/moneyTokens';

// --- Stablecoin Earn Money Deposit Footer CTA Visibility A/B Test ---

export const EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY =
  'earnMUSD1516AbtestStablecoinTokenDetailsFooterMoneyDepositButton';

export enum EarnMoneyDepositStablecoinFooterCtaVisibilityVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS: Record<
  EarnMoneyDepositStablecoinFooterCtaVisibilityVariant,
  { showMoneyDepositFooterCta: boolean }
> = {
  [EarnMoneyDepositStablecoinFooterCtaVisibilityVariant.Control]: {
    showMoneyDepositFooterCta: false,
  },
  [EarnMoneyDepositStablecoinFooterCtaVisibilityVariant.Treatment]: {
    showMoneyDepositFooterCta: true,
  },
};

export const EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA =
  {
    experimentName: 'Stablecoin Asset Overview Footer Money Deposit CTA',
    variationNames: {
      [EarnMoneyDepositStablecoinFooterCtaVisibilityVariant.Control]:
        'Stablecoin footer CTA hidden',
      [EarnMoneyDepositStablecoinFooterCtaVisibilityVariant.Treatment]:
        'Stablecoin footer CTA shown',
    },
  };

export const EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
    validVariants: Object.values(
      EarnMoneyDepositStablecoinFooterCtaVisibilityVariant,
    ),
    eventNames: [EVENT_NAME.MONEY_BUTTON_CLICKED],
    eventPropertyRequirements: {
      [EVENT_NAME.MONEY_BUTTON_CLICKED]: {
        component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_FOOTER_CTA,
        token_symbol: STABLECOIN_TOKEN_SYMBOLS,
      },
    },
  };
