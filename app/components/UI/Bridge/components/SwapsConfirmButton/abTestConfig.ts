import { ButtonVariant } from '@metamask/design-system-react-native';

export const SWAPS_CTA_BUTTON_COLOR_AB_KEY =
  'swapsSWAPS4784AbtestCTAButtonColor';

export enum SwapsCtaButtonColorVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface SwapsCtaButtonColorVariantConfig {
  buttonVariant: ButtonVariant;
}

export const SWAPS_CTA_BUTTON_COLOR_VARIANTS: Record<
  SwapsCtaButtonColorVariant,
  SwapsCtaButtonColorVariantConfig
> = {
  [SwapsCtaButtonColorVariant.Control]: {
    buttonVariant: ButtonVariant.Primary,
  },
  [SwapsCtaButtonColorVariant.Treatment]: {
    buttonVariant: ButtonVariant.Secondary,
  },
};

export const SWAPS_CTA_BUTTON_COLOR_EXPOSURE_METADATA = {
  experimentName: 'Swap CTA Button Color',
  variationNames: {
    [SwapsCtaButtonColorVariant.Control]: 'Current primary',
    [SwapsCtaButtonColorVariant.Treatment]: 'Green secondary',
  },
};
