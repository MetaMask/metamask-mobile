// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { getBadgeStoryProps } from '../../../../Badges/Badge/Badge.stories';
import { AvatarSizes, AvatarBadgePositions } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarImage from './AvatarImage';
import { AvatarImageProps } from './AvatarImage.types';
import { SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS } from './AvatarImage.constants';

export const getAvatarImageStoryProps = (): AvatarImageProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    DEFAULT_AVATAR_SIZE,
    storybookPropsGroupID,
  );
  const includesBadge = boolean('includesBadge', false, storybookPropsGroupID);
  let badgePosition, badgeProps;

  if (includesBadge) {
    badgePosition = select(
      'badgePosition',
      AvatarBadgePositions,
      AvatarBadgePositions.TopRight,
      storybookPropsGroupID,
    );
    badgeProps = getBadgeStoryProps();
  }
  return {
    size: sizeSelector,
    badgePosition,
    badgeProps,
    imageProps: SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS,
  };
};

const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
