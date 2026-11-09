import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';
import { COMPONENT_NAMES } from '../../Money/constants/moneyEventLocations';

// --- Ambient Price Color A/B Test ---

// TODO: Update hardcoded color once we get confirmation from design leads.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const AMBIENT_NEGATIVE_COLOR = '#FA4B00';

export const AMBIENT_PRICE_COLOR_AB_KEY =
  'assetsASSETS3205AbtestAmbientPriceColor';

export enum AmbientPriceColorVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const AMBIENT_PRICE_COLOR_VARIANTS: Record<
  AmbientPriceColorVariant,
  { useAmbientPriceColor: boolean }
> = {
  [AmbientPriceColorVariant.Control]: { useAmbientPriceColor: false },
  [AmbientPriceColorVariant.Treatment]: { useAmbientPriceColor: true },
};

export const AMBIENT_PRICE_COLOR_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: AMBIENT_PRICE_COLOR_AB_KEY,
    validVariants: Object.values(AmbientPriceColorVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      EVENT_NAME.SWAP_PAGE_VIEWED,
      EVENT_NAME.ONRAMP_PURCHASE_SUBMITTED,
      EVENT_NAME.ONRAMP_PURCHASE_COMPLETED,
    ],
  };

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

export const STABLECOIN_TOKEN_SYMBOLS = [
  'USDC',
  'USDT',
  'DAI',
  'mUSD',
  'MUSD',
  'PYUSD',
] as const;

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
