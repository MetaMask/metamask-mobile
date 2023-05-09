/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import { BannerVariant } from '../../Banner.types';

// Internal dependencies.
import {
  BannerTipProps,
  BannerTipLogoType,
  ImageSourceByBannerTipLogoType,
} from './BannerTip.types';

// Defaults
export const DEFAULT_BANNERTIP_LOGOTYPE = BannerTipLogoType.Greeting;

// Test IDs
export const BANNERTIP_TEST_ID = 'bannertip';

// Mappings
import logoFoxChat from './assets/fox-chat.png';
import logoFoxGreeting from './assets/fox-greeting.png';
export const IMAGESOURCE_BY_BANNERTIPLOGOTYPE: ImageSourceByBannerTipLogoType =
  {
    [BannerTipLogoType.Chat]: logoFoxChat,
    [BannerTipLogoType.Greeting]: logoFoxGreeting,
  };

// Sample consts
export const SAMPLE_BANNERTIP_TITLE = 'Sample Banner Tip Title';
export const SAMPLE_BANNERTIP_DESCRIPTION = 'Sample Banner Tip Description';
export const SAMPLE_BANNERTIP_ACTIONBUTTONLABEL = 'Sample Action Button Label';
export const SAMPLE_BANNERTIP_PROPS: BannerTipProps = {
  variant: BannerVariant.Tip,
  logoType: DEFAULT_BANNERTIP_LOGOTYPE,
  title: SAMPLE_BANNERTIP_TITLE,
  description: SAMPLE_BANNERTIP_DESCRIPTION,
  actionButtonProps: {
    label: SAMPLE_BANNERTIP_ACTIONBUTTONLABEL,
    onPress: () => console.log('actionButton clicked!'),
  },
  onClose: () => console.log('closeButton clicked!'),
};
