// Third party dependencies.
import React from 'react';
import { boolean, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import { getBadgeStoryProps } from '../../../../Badges/Badge/Badge.stories';
import { AvatarSizes, AvatarBadgePositions } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { SAMPLE_JAZZICON_PROPS } from './AvatarJazzIcon.constants';

export const getAvatarJazzIconStoryProps = (): AvatarJazzIconProps => {
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
    jazzIconProps: SAMPLE_JAZZICON_PROPS,
  };
};
const AvatarJazzIconStory = () => (
  <AvatarJazzIcon {...getAvatarJazzIconStoryProps()} />
);

export default AvatarJazzIconStory;
