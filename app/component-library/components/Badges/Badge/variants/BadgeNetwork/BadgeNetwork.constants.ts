/* eslint-disable import/prefer-default-export */

// External dependencies.
import { AvatarSize } from '../../../../Avatars/Avatar';
import { SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL } from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import { BadgeNetworkProps } from './BadgeNetwork.types';

// Test IDs
export const BADGE_NETWORK_TEST_ID = 'badge-network';

// Defaults
export const DEFAULT_BADGENETWORK_NETWORKICON_SIZE = AvatarSize.Md;

// Samples
const SAMPLE_BADGENETWORK_NAME = 'Ethereum';
const SAMPLE_BADGENETWORK_IMAGESOURCE = SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL;
export const SAMPLE_BADGENETWORK_PROPS: BadgeNetworkProps = {
  name: SAMPLE_BADGENETWORK_NAME,
  imageSource: SAMPLE_BADGENETWORK_IMAGESOURCE,
};
