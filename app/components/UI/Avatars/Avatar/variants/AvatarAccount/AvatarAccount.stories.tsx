// Third party dependencies.
import React from 'react';
import { text, select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import {
  AvatarSizes,
  AvatarVariants,
  DEFAULT_AVATAR_SIZE,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import { BadgeVariants } from '../../../../../../component-library/components/Badges/Badge/Badge.types';
import { IconName } from '../../../../../../component-library/components/Icon';

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
      variant: AvatarVariants.Icon,
      name: IconName.AddOutline,
    },
  },
});
const AvatarAccountStory = () => (
  <AvatarAccount {...getAvatarAccountStoryProps()} />
);

export default AvatarAccountStory;
