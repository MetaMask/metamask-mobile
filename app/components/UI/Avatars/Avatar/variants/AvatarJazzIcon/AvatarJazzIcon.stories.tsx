// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import { AvatarSizes } from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { TEST_AVATAR_JAZZICON_ADDRESS } from './AvatarJazzIcon.constants';

export const getAvatarJazzIconStoryProps = (): AvatarJazzIconProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    AvatarSizes.Md,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    address: TEST_AVATAR_JAZZICON_ADDRESS,
  };
};
const AvatarJazzIconStory = () => (
  <AvatarJazzIcon {...getAvatarJazzIconStoryProps()} />
);

export default AvatarJazzIconStory;
