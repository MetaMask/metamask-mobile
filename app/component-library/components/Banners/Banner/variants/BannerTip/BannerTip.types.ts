// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { BannerBaseProps } from '@component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.types';
import { BannerVariant } from '@component-library/components/Banners/Banner/Banner.types';

/**
 * Logo Type of the BannerTip.
 */
export enum BannerTipLogoType {
  Chat = 'Chat',
  Greeting = 'Greeting',
}

/**
 * Mapping of ImageSource by BannerTipLogoType.
 */
export type ImageSourceByBannerTipLogoType = {
  [key in BannerTipLogoType]: ImageSourcePropType;
};

/**
 * BannerTip component props.
 */
export interface BannerTipProps extends BannerBaseProps {
  /**
   * Variant of Banner
   */
  variant?: BannerVariant.Tip;
  /**
   * Logo Type of the BannerTip.
   * @default BannerTipLogoType.Greeting
   */
  logoType?: BannerTipLogoType;
}

/**
 * Style sheet Banner Tip parameters.
 */
export type BannerTipStyleSheetVars = Pick<BannerTipProps, 'style'>;
