import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';
import { COMPONENT_NAMES } from '../../Money/constants/moneyEvents';

// --- Ambient Price Color A/B Test ---

// TODO: Update hardcoded color once we get confirmation from design leads.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const AMBIENT_NEGATIVE_COLOR = '#FF5C16';

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

// --- Earn Money Deposit Footer CTA Visibility A/B Test ---

export const EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY =
  'earnMUSD1278AbtestTokenDetailsFooterMoneyDepositButton';

export enum EarnMoneyDepositFooterCtaVisibilityVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_VARIANTS: Record<
  EarnMoneyDepositFooterCtaVisibilityVariant,
  { showMoneyDepositFooterCta: boolean }
> = {
  [EarnMoneyDepositFooterCtaVisibilityVariant.Control]: {
    showMoneyDepositFooterCta: false,
  },
  [EarnMoneyDepositFooterCtaVisibilityVariant.Treatment]: {
    showMoneyDepositFooterCta: true,
  },
};

export const EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY,
    validVariants: Object.values(EarnMoneyDepositFooterCtaVisibilityVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      EVENT_NAME.MONEY_BUTTON_CLICKED,
    ],
    eventPropertyRequirements: {
      // Prevent attaching active_ab_test property to unrelated Money Button Clicked events.
      [EVENT_NAME.MONEY_BUTTON_CLICKED]: {
        component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_FOOTER_CTA,
      },
    },
  };
