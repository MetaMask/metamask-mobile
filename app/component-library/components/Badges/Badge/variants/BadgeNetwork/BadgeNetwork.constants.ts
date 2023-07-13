/* eslint-disable import/prefer-default-export */

// External dependencies.
import { AvatarSize } from '../../../../Avatars/Avatar';
import {
  TEST_REMOTE_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { BadgeVariant } from '../../Badge.types';

// Internal dependencies.
import { BadgeNetworkProps } from './BadgeNetwork.types';

// Test IDs
export const BADGE_NETWORK_TEST_ID = 'badge-network';

// Defaults
export const DEFAULT_BADGENETWORK_NETWORKICON_SIZE = AvatarSize.Md;

// Samples
const SAMPLE_BADGENETWORK_NAME = TEST_NETWORK_NAME;
const SAMPLE_BADGENETWORK_IMAGESOURCE = TEST_REMOTE_IMAGE_SOURCE;
export const SAMPLE_BADGENETWORK_PROPS: BadgeNetworkProps = {
  variant: BadgeVariant.Network,
  name: SAMPLE_BADGENETWORK_NAME,
  imageSource: SAMPLE_BADGENETWORK_IMAGESOURCE,
};
