// Third party dependencies.
import React from 'react';
import { text, select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import { BadgeVariants } from '../../../../../../component-library/components/Badges/Badge/Badge.types';
import {
  AvatarBadgePositions,
  AvatarSizes,
  AvatarVariants,
} from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { AvatarAccountType, AvatarAccountProps } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

export const getAvatarAccountStoryProps = (): AvatarAccountProps => ({
  accountAddress: text(
    'accountAddress',
    DUMMY_WALLET_ADDRESS,
    storybookPropsGroupID,
  ),
  size: select('size', AvatarSizes, DEFAULT_AVATAR_SIZE, storybookPropsGroupID),
  type: select(
    'type',
    AvatarAccountType,
    AvatarAccountType.JazzIcon,
    storybookPropsGroupID,
  ),
  isBadgeIncluded: boolean('isBadgeIncluded', false, storybookPropsGroupID),
  badgeProps: {
    variant: BadgeVariants.Avatar,
    avatarProps: {
      variant: AvatarVariants.JazzIcon,
      accountAddress: DUMMY_WALLET_ADDRESS,
    },
  },
  badgePosition: select(
    'badgePosition',
    AvatarBadgePositions,
    AvatarBadgePositions.TopRight,
    storybookPropsGroupID,
  ),
});
const AvatarAccountStory = () => (
  <AvatarAccount {...getAvatarAccountStoryProps()} />
);

export default AvatarAccountStory;
