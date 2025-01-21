import React from 'react';
import {
  UPSELL_BANNER_VARIANTS,
  UpsellBannerInteractiveProps,
  UpsellBannerProps,
  UpsellBannerReadOnlyProps,
} from './UpsellBanner.types';
import UpsellBannerInteractive from './UpsellBannerInteractive';
import UpsellBannerReadOnly from './UpsellBannerReadOnly';

const UpsellBanner = ({
  variant = UPSELL_BANNER_VARIANTS.READ_ONLY,
  ...props
}: UpsellBannerProps) => {
  switch (variant) {
    case UPSELL_BANNER_VARIANTS.INTERACTIVE:
      return (
        <UpsellBannerInteractive {...(props as UpsellBannerInteractiveProps)} />
      );
    case UPSELL_BANNER_VARIANTS.READ_ONLY:
    default:
      return <UpsellBannerReadOnly {...(props as UpsellBannerReadOnlyProps)} />;
  }
};

export default UpsellBanner;
