// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import AvatarIconStory, {
  getAvatarIconStoryProps,
} from './variants/AvatarIcon/AvatarIcon.stories';
import AvatarImageStory, {
  getAvatarImageStoryProps,
} from './variants/AvatarImage/AvatarImage.stories';
import AvatarInitialStory, {
  getAvatarInitialStoryProps,
} from './variants/AvatarInitial/AvatarInitial.stories';

// Internal dependencies.
import { AvatarVariants, AvatarProps } from './Avatar.types';
import Avatar from './Avatar';

export const getAvatarStoryProps = (): AvatarProps => {
  let avatarProps: AvatarProps;

  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariants,
    AvatarVariants.Icon,
    storybookPropsGroupID,
  );
  switch (avatarVariantsSelector) {
    case AvatarVariants.Icon:
      avatarProps = {
        ...getAvatarIconStoryProps(),
      };
      break;
    case AvatarVariants.Image:
      avatarProps = {
        ...getAvatarImageStoryProps(),
      };
      break;
    case AvatarVariants.Initial:
      avatarProps = {
        ...getAvatarInitialStoryProps(),
      };
      break;
  }

  return avatarProps;
};
const AvatarStory = () => <Avatar {...getAvatarStoryProps()} />;

storiesOf('Component Library / Avatars', module)
  .add('Avatar', AvatarStory)
  .add('Variants / AvatarIcon', AvatarIconStory)
  .add('Variants / AvatarImage', AvatarImageStory)
  .add('Variants / AvatarInitial', AvatarInitialStory);

export default AvatarStory;
