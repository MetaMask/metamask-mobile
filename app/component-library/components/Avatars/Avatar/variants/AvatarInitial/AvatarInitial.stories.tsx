// Third party dependencies.
import React from 'react';
import { color, select, boolean, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { getBadgeStoryProps } from '../../../../Badges/Badge/Badge.stories';
import { AvatarSizes, AvatarBadgePositions } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarInitial from './AvatarInitial';
import { AvatarInitialProps } from './AvatarInitial.types';
import { SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT } from './AvatarInitial.constants';

export const getAvatarInitialStoryProps = (): AvatarInitialProps => {
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

  const initialText = text(
    'initial',
    SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT,
    storybookPropsGroupID,
  );

  const initialColor = color('initialColor', '', storybookPropsGroupID);
  const backgroundColor = color('backgroundColor', '', storybookPropsGroupID);

  return {
    size: sizeSelector,
    badgePosition,
    badgeProps,
    initial: initialText,
    initialColor,
    backgroundColor,
  };
};
const AvatarInitialStory = () => (
  <AvatarInitial {...getAvatarInitialStoryProps()} />
);

export default AvatarInitialStory;
