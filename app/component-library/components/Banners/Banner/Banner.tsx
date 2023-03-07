import React from 'react';

// External dependencies.
import BannerAlert from './variants/BannerAlert';
import BannerTip from './variants/BannerTip';

// Internal dependencies.
import { BannerProps, BannerVariant } from './Banner.types';

const Banner = (bannerProps: BannerProps) => {
  switch (bannerProps.variant) {
    case BannerVariant.Alert:
      return <BannerAlert {...bannerProps} />;
    case BannerVariant.Tip:
      return <BannerTip {...bannerProps} />;
    default:
      throw new Error('Invalid Banner Variant');
  }
};

export default Banner;
