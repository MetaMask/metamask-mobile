export enum UPSELL_BANNER_VARIANTS {
  HEADER = 'HEADER',
  BODY = 'BODY',
}

interface UpsellBannerBaseProps {
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  endAccessory?: React.ReactNode;
}

export type UpsellBannerHeaderProps = UpsellBannerBaseProps;

export type UpsellBannerBodyProps = UpsellBannerBaseProps & {
  onTooltipPress: () => void;
};

export type UpsellBannerProps =
  | (UpsellBannerHeaderProps & { variant: UPSELL_BANNER_VARIANTS.HEADER })
  | (UpsellBannerBodyProps & {
      variant: UPSELL_BANNER_VARIANTS.BODY;
    });
