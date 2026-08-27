export const SWAPS_CTA_BUTTON_COLOR_AB_KEY =
  'swapsSWAPS4784AbtestCTAButtonColor';

export enum SwapsCtaButtonColorVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface SwapsCtaButtonColorVariantConfig {
  hasSuccessColor: boolean;
}

export const SWAPS_CTA_BUTTON_COLOR_VARIANTS: Record<
  SwapsCtaButtonColorVariant,
  SwapsCtaButtonColorVariantConfig
> = {
  [SwapsCtaButtonColorVariant.Control]: {
    hasSuccessColor: false,
  },
  [SwapsCtaButtonColorVariant.Treatment]: {
    hasSuccessColor: true,
  },
};

export const SWAPS_CTA_BUTTON_COLOR_EXPOSURE_METADATA = {
  experimentName: 'Swap CTA Button Color',
  variationNames: {
    [SwapsCtaButtonColorVariant.Control]: 'Current primary',
    [SwapsCtaButtonColorVariant.Treatment]: 'Green success',
  },
};
