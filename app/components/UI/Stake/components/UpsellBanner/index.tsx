import React from 'react';
import {
  UPSELL_BANNER_VARIANTS,
  UpsellBannerBodyProps,
  UpsellBannerProps,
  UpsellBannerHeaderProps,
} from './UpsellBanner.types';
import UpsellBannerBody from './UpsellBannerBody';
import UpsellBannerHeader from './UpsellBannerHeader';

const UpsellBanner = ({
  variant = UPSELL_BANNER_VARIANTS.HEADER,
  ...props
}: UpsellBannerProps) => {
  switch (variant) {
    case UPSELL_BANNER_VARIANTS.BODY:
      return <UpsellBannerBody {...(props as UpsellBannerBodyProps)} />;
    case UPSELL_BANNER_VARIANTS.HEADER:
    default:
      return <UpsellBannerHeader {...(props as UpsellBannerHeaderProps)} />;
  }
};

export default UpsellBanner;
