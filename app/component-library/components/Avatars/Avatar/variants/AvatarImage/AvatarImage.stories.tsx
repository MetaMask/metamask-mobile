// Third party dependencies.
import React from 'react';

// External dependencies.
import { AvatarVariants } from '../../Avatar.types';
import { getAvatarBaseStoryProps } from '../../foundation/AvatarBase/AvatarBase.stories';

// Internal dependencies.
import AvatarImage from './AvatarImage';
import { AvatarImageProps } from './AvatarImage.types';
import { SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS } from './AvatarImage.constants';

export const getAvatarImageStoryProps = (): AvatarImageProps => ({
  variant: AvatarVariants.Image,
  ...getAvatarBaseStoryProps(),
  imageProps: SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS,
});
const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
