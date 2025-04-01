/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { AvatarFaviconProps } from './AvatarFavicon.types';

// Defaults
export const DEFAULT_AVATARFAVICON_SIZE = AvatarSize.Md;
export const DEFAULT_AVATARFAVICON_ERROR_ICON = IconName.Global;
export const TEST_REMOTE_SVG_IMAGE_URL =
  'https://metamask.github.io/test-dapp/metamask-fox.svg';

// Test IDs
export const AVATARFAVICON_IMAGE_TESTID = 'favicon-avatar-image';
export const AVATARFAVICON_IMAGE_SVG_TESTID = 'favicon-avatar-svg-image';

// Sample consts
export const SAMPLE_AVATARFAVICON_IMAGESOURCE_REMOTE: ImageSourcePropType = {
  uri: 'https://uniswap.org/favicon.ico',
};
export const SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE: ImageSourcePropType = {
  uri: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
};
/* eslint-disable-next-line */
export const SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL: ImageSourcePropType = require('../../../../../../images/branding/fox.png');

export const SAMPLE_AVATARFAVICON_PROPS: AvatarFaviconProps = {
  imageSource: SAMPLE_AVATARFAVICON_IMAGESOURCE_REMOTE,
  size: DEFAULT_AVATARFAVICON_SIZE,
};
