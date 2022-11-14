// Third party dependencies.
import React from 'react';
import { boolean, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';
import { CirclePatternBadgePositions } from '../../../../../patterns/Circles/Circle/Circle.types';
import { getBadgeStoryProps } from '../../../../Badges/Badge/Badge.stories';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarBaseProps } from './AvatarBase.types';

export const getAvatarBaseStoryProps = (): AvatarBaseProps => {
  const size = select(
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
      CirclePatternBadgePositions,
      CirclePatternBadgePositions.TopRight,
      storybookPropsGroupID,
    );
    badgeProps = getBadgeStoryProps();
  }

  return {
    size,
    badgePosition,
    badgeProps,
  };
};
const AvatarBaseStory = () => <AvatarBase {...getAvatarBaseStoryProps()} />;

export default AvatarBaseStory;
