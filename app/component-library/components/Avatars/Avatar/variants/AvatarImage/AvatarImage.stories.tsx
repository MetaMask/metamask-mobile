// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes, AvatarVariants } from '../../Avatar.types';

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

  return {
    variant: AvatarVariants.Image,
    size: sizeSelector,
    imageSource: TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE,
    isHaloEnabled,
  };
};
const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
