import React from 'react';

// External dependencies.
import BannerAlert from './variants/BannerAlert';
import BannerTip from './variants/BannerTip';

// Internal dependencies.
import { BannerProps, BannerVariant } from './Banner.types';

/**
 * @deprecated Please update your code to use `BannerAlert` from `@metamask/design-system-react-native`.
 * The `BannerVariant.Tip` variant is unused and will be removed.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BannerAlert/README.md}
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/MIGRATION.md Migration docs}
 * @since @metamask/design-system-react-native@0.11.0
 */
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
