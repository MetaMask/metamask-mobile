/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../../component-library/constants/storybook.constants';
import AvatarAccountStory, {
  getAvatarAccountStoryProps,
} from './variants/AvatarAccount/AvatarAccount.stories';
import AvatarFaviconStory, {
  getAvatarFaviconStoryProps,
} from './variants/AvatarFavicon/AvatarFavicon.stories';
import AvatarNetworkStory, {
  getAvatarNetworkStoryProps,
} from './variants/AvatarNetwork/AvatarNetwork.stories';
import AvatarTokenStory, {
  getAvatarTokenStoryProps,
} from './variants/AvatarToken/AvatarToken.stories';

// Internal dependencies.
import { AvatarVariants, AvatarProps } from './Avatar.types';
import Avatar from './Avatar';

export const getAvatarStoryProps = (): AvatarProps => {
  let avatarProps: AvatarProps;

  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariants,
    AvatarVariants.Account,
    storybookPropsGroupID,
  );
  switch (avatarVariantsSelector) {
    case AvatarVariants.Account:
      avatarProps = {
        variant: AvatarVariants.Account,
        ...getAvatarAccountStoryProps(),
      };
      break;
    case AvatarVariants.Favicon:
      avatarProps = {
        variant: AvatarVariants.Favicon,
        ...getAvatarFaviconStoryProps(),
      };
      break;
    case AvatarVariants.Network:
      avatarProps = {
        variant: AvatarVariants.Network,
        ...getAvatarNetworkStoryProps(),
      };
      break;
    case AvatarVariants.Token:
      avatarProps = {
        variant: AvatarVariants.Token,
        ...getAvatarTokenStoryProps(),
      };
      break;
  }
  return avatarProps;
};
const AvatarStory = () => <Avatar {...getAvatarStoryProps()} />;

storiesOf('Components / UI / Avatars', module)
  .add('Avatar', AvatarStory)
  .add('Variants / AvatarAccount', AvatarAccountStory)
  .add('Variants / AvatarFavicon', AvatarFaviconStory)
  .add('Variants / AvatarNetwork', AvatarNetworkStory)
  .add('Variants / AvatarToken', AvatarTokenStory);

export default AvatarStory;
