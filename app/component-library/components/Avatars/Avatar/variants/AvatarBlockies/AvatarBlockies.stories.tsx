// Third party dependencies.
import React from 'react';
import { select, boolean, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { getBadgeStoryProps } from '../../../../Badges/Badge/Badge.stories';
import { AvatarSizes, AvatarBadgePositions } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import { AvatarBlockiesProps } from './AvatarBlockies.types';
import { SAMPLE_AVATAR_BLOCKIES_ACCOUNT_ADDRESS } from './AvatarBlockies.constants';

export const getAvatarBlockiesStoryProps = (): AvatarBlockiesProps => {
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

  const accountAddress = text(
    'accountAddress',
    SAMPLE_AVATAR_BLOCKIES_ACCOUNT_ADDRESS,
    storybookPropsGroupID,
  );
  return {
    size: sizeSelector,
    badgePosition,
    badgeProps,
    accountAddress,
  };
};

const AvatarBlockiesStory = () => (
  <AvatarBlockies {...getAvatarBlockiesStoryProps()} />
);

export default AvatarBlockiesStory;
