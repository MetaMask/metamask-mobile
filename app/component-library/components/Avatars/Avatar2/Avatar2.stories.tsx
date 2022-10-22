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
import AvatarJazzIconStory, {
  getAvatarJazzIconStoryProps,
} from './variants/AvatarJazzIcon/AvatarJazzIcon.stories';

// Internal dependencies.
import { AvatarVariants, Avatar2Props } from './Avatar2.types';
import Avatar2 from './Avatar2';

export const getAvatarStoryProps = (): Avatar2Props => {
  let avatarProps: Avatar2Props;

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
    case AvatarVariants.JazzIcon:
      avatarProps = {
        ...getAvatarJazzIconStoryProps(),
      };
      break;
  }

  return avatarProps;
};
const Avatar2Story = () => <Avatar2 {...getAvatarStoryProps()} />;

storiesOf('Component Library / Avatars', module)
  .add('Avatar2', Avatar2Story)
  .add('Variants / AvatarIcon', AvatarIconStory)
  .add('Variants / AvatarImage', AvatarImageStory)
  .add('Variants / AvatarInitial', AvatarInitialStory)
  .add('Variants / AvatarJazzIcon', AvatarJazzIconStory);

export default Avatar2Story;
