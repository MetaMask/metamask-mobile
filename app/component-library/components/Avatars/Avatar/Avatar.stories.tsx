// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import AvatarBlockiesStory, {
  getAvatarBlockiesStoryProps,
} from './variants/AvatarBlockies/AvatarBlockies.stories';
import AvatarImageStory, {
  getAvatarImageStoryProps,
} from './variants/AvatarImage/AvatarImage.stories';
import AvatarInitialStory, {
  getAvatarInitialStoryProps,
} from './variants/AvatarInitial/AvatarInitial.stories';
import AvatarJazzIconStory, {
  getAvatarJazzIconStoryProps,
} from './variants/AvatarJazzIcon/AvatarJazzIcon.stories';

// Internal dependencies.
import { AvatarVariants, AvatarProps } from './Avatar.types';
import Avatar from './Avatar';

export const getAvatarStoryProps = (): AvatarProps => {
  let avatarProps: AvatarProps;

  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariants,
    AvatarVariants.Blockies,
    storybookPropsGroupID,
  );
  switch (avatarVariantsSelector) {
    case AvatarVariants.Blockies:
      avatarProps = {
        variant: AvatarVariants.Blockies,
        ...getAvatarBlockiesStoryProps(),
      };
      break;
    case AvatarVariants.Image:
      avatarProps = {
        variant: AvatarVariants.Image,
        ...getAvatarImageStoryProps(),
      };
      break;
    case AvatarVariants.Initial:
      avatarProps = {
        variant: AvatarVariants.Initial,
        ...getAvatarInitialStoryProps(),
      };
      break;
    case AvatarVariants.JazzIcon:
      avatarProps = {
        variant: AvatarVariants.JazzIcon,
        ...getAvatarJazzIconStoryProps(),
      };
      break;
  }

  return avatarProps;
};
const AvatarStory = () => <Avatar {...getAvatarStoryProps()} />;

storiesOf('Component Library / Avatars', module)
  .add('Avatar', AvatarStory)
  .add('Variants / AvatarBlockies', AvatarBlockiesStory)
  .add('Variants / AvatarImage', AvatarImageStory)
  .add('Variants / AvatarInitial', AvatarInitialStory)
  .add('Variants / AvatarJazzIcon', AvatarJazzIconStory);

export default AvatarStory;
