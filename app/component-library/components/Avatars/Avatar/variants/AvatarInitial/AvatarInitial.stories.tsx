// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes } from '../../Avatar.types';
import {
  BadgeProps,
  BadgeVariants,
} from '../../../../Badges/Badge/Badge.types';
import { TEST_AVATAR_PROPS } from '../../../../Badges/Badge/variants/BadgeAvatar/BadgeAvatar.constants';

// Internal dependencies.
import AvatarInitial from './AvatarInitial';
import { AvatarInitialProps } from './AvatarInitial.types';
import { TEST_AVATAR_INITIAL_SAMPLE_TEXT } from './AvatarInitial.constants';

export const getAvatarInitialStoryProps = (): AvatarInitialProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    AvatarSizes.Md,
    storybookPropsGroupID,
  );
  const initialText = text(
    'initial',
    TEST_AVATAR_INITIAL_SAMPLE_TEXT,
    storybookPropsGroupID,
  );

  const includeBadge = boolean('includeBadge', false, storybookPropsGroupID);

  const badgeProps: BadgeProps = {
    variant: BadgeVariants.Avatar,
    avatarProps: TEST_AVATAR_PROPS,
  };

  return {
    size: sizeSelector,
    initial: initialText,
    includeBadge,
    badgeProps,
  };
};
const AvatarInitialStory = () => (
  <AvatarInitial {...getAvatarInitialStoryProps()} />
);

export default AvatarInitialStory;
