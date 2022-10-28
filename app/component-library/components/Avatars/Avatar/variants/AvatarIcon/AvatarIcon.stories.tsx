// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes } from '../../Avatar.types';
import { IconName } from '../../../../Icon';
import {
  BadgeProps,
  BadgeVariants,
} from '../../../../Badges/Badge/Badge.types';
import { TEST_AVATAR_PROPS } from '../../../../Badges/Badge/variants/BadgeAvatar/BadgeAvatar.constants';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';
import { AvatarIconProps } from './AvatarIcon.types';

export const getAvatarIconStoryProps = (): AvatarIconProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    AvatarSizes.Md,
    storybookPropsGroupID,
  );
  const iconNameSelector = select(
    'name',
    IconName,
    IconName.LockFilled,
    storybookPropsGroupID,
  );
  const includeBadge = boolean('includeBadge', false, storybookPropsGroupID);

  const badgeProps: BadgeProps = {
    variant: BadgeVariants.Avatar,
    avatarProps: TEST_AVATAR_PROPS,
  };

  return {
    size: sizeSelector,
    name: iconNameSelector,
    includeBadge,
    badgeProps,
  };
};
const AvatarIconStory = () => <AvatarIcon {...getAvatarIconStoryProps()} />;

export default AvatarIconStory;
