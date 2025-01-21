export enum UPSELL_BANNER_VARIANTS {
  READ_ONLY = 'READ_ONLY',
  INTERACTIVE = 'INTERACTIVE',
}

interface UpsellBannerBaseProps {
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
}

export type UpsellBannerReadOnlyProps = UpsellBannerBaseProps;

export type UpsellBannerInteractiveProps = UpsellBannerBaseProps & {
  buttonLabel: string;
  onButtonPress: () => void;
  onTooltipPress: () => void;
};

export type UpsellBannerProps =
  | (UpsellBannerReadOnlyProps & { variant: UPSELL_BANNER_VARIANTS.READ_ONLY })
  | (UpsellBannerInteractiveProps & {
      variant: UPSELL_BANNER_VARIANTS.INTERACTIVE;
    });
