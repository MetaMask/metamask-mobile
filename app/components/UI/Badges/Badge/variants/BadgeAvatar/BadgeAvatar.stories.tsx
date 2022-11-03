// Third party dependencies.
import React from 'react';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import { getAvatarStoryProps } from '../../../../Avatars/Avatar/Avatar.stories';
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import BadgeAvatar from './BadgeAvatar';
import { BadgeAvatarProps } from './BadgeAvatar.types';

export const getBadgeAvatarStoryProps = (): BadgeAvatarProps => {
  const avatarProps: AvatarProps = getAvatarStoryProps();

  return {
    variant: BadgeVariants.Avatar,
    avatarProps,
  };
};
const BadgeAvatarStory = () => <BadgeAvatar {...getBadgeAvatarStoryProps()} />;

export default BadgeAvatarStory;
