// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes } from '../../Avatar.types';
import {
  BadgeProps,
  BadgeVariants,
} from '../../../../Badges/Badge/Badge.types';
import { TEST_AVATAR_PROPS } from '../../../../Badges/Badge/variants/BadgeAvatar/BadgeAvatar.constants';

// Internal dependencies.
import AvatarImage from './AvatarImage';
import { AvatarImageProps } from './AvatarImage.types';
import { TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE } from './AvatarImage.constants';

export const getAvatarImageStoryProps = (): AvatarImageProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    AvatarSizes.Md,
    storybookPropsGroupID,
  );

  const isHaloEnabled = boolean('isHaloEnabled', false, storybookPropsGroupID);

  const includeBadge = boolean('includeBadge', false, storybookPropsGroupID);

  const badgeProps: BadgeProps = {
    variant: BadgeVariants.Avatar,
    avatarProps: TEST_AVATAR_PROPS,
  };

  return {
    size: sizeSelector,
    source: TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE,
    isHaloEnabled,
    includeBadge,
    badgeProps,
  };
};
const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
