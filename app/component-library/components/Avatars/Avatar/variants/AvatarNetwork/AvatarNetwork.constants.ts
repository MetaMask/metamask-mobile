/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImageSourcePropType, Platform } from 'react-native';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { BrowserViewSelectorsIDs } from '../../../../../../../e2e/selectors/BrowserView.selectors';
import generateTestId from '../../../../../../../wdio/utils/generateTestId';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';

// Defaults
export const DEFAULT_AVATARNETWORK_SIZE = AvatarSize.Md;
export const DEFAULT_AVATARNETWORK_ERROR_TEXT = '?';

// Test IDs
export const AVATARNETWORK_IMAGE_TESTID = generateTestId(
  Platform,
  BrowserViewSelectorsIDs.AVATAR_IMAGE,
).testID;

// Sample consts
const SAMPLE_AVATARNETWORK_IMAGESOURCE_REMOTE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};

/* eslint-disable-next-line */
export const SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL: ImageSourcePropType = require('../../../../../../images/ethereum.png');

export const SAMPLE_AVATARNETWORK_PROPS: AvatarNetworkProps = {
  size: DEFAULT_AVATARNETWORK_SIZE,
  name: 'Ethereum',
  imageSource: SAMPLE_AVATARNETWORK_IMAGESOURCE_REMOTE,
};
