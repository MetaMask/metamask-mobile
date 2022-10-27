// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { TEST_AVATAR_JAZZICON_ADDRESS } from './AvatarJazzIcon.constants';

export const getAvatarJazzIconStoryProps = (): AvatarJazzIconProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );

  return {
    variant: AvatarVariants.JazzIcon,
    size: sizeSelector,
    address: TEST_AVATAR_JAZZICON_ADDRESS,
  };
};
const AvatarJazzIconStory = () => (
  <AvatarJazzIcon {...getAvatarJazzIconStoryProps()} />
);

export default AvatarJazzIconStory;
