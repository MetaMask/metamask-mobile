/* eslint-disable import/prefer-default-export */
// External dependencies.
import { STORYBOOK_BANNERALERT_ARGTYPES } from './variants/BannerAlert/BannerAlert.constants';
import { STORYBOOK_BANNERTIP_ARGTYPES } from './variants/BannerTip/BannerTip.constants';

// Internal dependencies.
import { BannerVariant } from './Banner.types';

// Defaults
export const DEFAULT_BANNER_VARIANT = BannerVariant.Alert;

// Storybook settings

export const STORYBOOK_BANNER_ARGTYPES = {
  variant: {
    options: BannerVariant,
    control: { type: 'select' },
  },
};
