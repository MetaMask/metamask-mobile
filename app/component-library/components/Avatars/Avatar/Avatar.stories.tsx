/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import AvatarAccountStory, {
  getAvatarAccountStoryProps,
} from './variants/AvatarAccount/AvatarAccount.stories';
import AvatarFaviconStory, {
  getAvatarFaviconStoryProps,
} from './variants/AvatarFavicon/AvatarFavicon.stories';
import AvatarIconStory, {
  getAvatarIconStoryProps,
} from './variants/AvatarIcon/AvatarIcon.stories';
import AvatarNetworkStory, {
  getAvatarNetworkStoryProps,
} from './variants/AvatarNetwork/AvatarNetwork.stories';
import AvatarTokenStory, {
  getAvatarTokenStoryProps,
} from './variants/AvatarToken/AvatarToken.stories';

// Internal dependencies.
import { AvatarVariant, AvatarProps } from './Avatar.types';
import Avatar from './Avatar';

export const getAvatarStoryProps = (): AvatarProps => {
  let avatarProps: AvatarProps;

  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariant,
    AvatarVariant.Account,
    storybookPropsGroupID,
  );
  switch (avatarVariantsSelector) {
    case AvatarVariant.Account:
      avatarProps = {
        variant: AvatarVariant.Account,
        ...getAvatarAccountStoryProps(),
      };
      break;
    case AvatarVariant.Favicon:
      avatarProps = {
        variant: AvatarVariant.Favicon,
        ...getAvatarFaviconStoryProps(),
      };
      break;
    case AvatarVariant.Icon:
      avatarProps = {
        variant: AvatarVariant.Icon,
        ...getAvatarIconStoryProps(),
      };
      break;
    case AvatarVariant.Network:
      avatarProps = {
        variant: AvatarVariant.Network,
        ...getAvatarNetworkStoryProps(),
      };
      break;
    case AvatarVariant.Token:
      avatarProps = {
        variant: AvatarVariant.Token,
        ...getAvatarTokenStoryProps(),
      };
      break;
  }
  return avatarProps;
};
const AvatarStory = () => <Avatar {...getAvatarStoryProps()} />;

storiesOf('Component Library / Avatars', module)
  .add('Avatar', AvatarStory)
  .add('Variants / AvatarAccount', AvatarAccountStory)
  .add('Variants / AvatarFavicon', AvatarFaviconStory)
  .add('Variants / AvatarIcon', AvatarIconStory)
  .add('Variants / AvatarNetwork', AvatarNetworkStory)
  .add('Variants / AvatarToken', AvatarTokenStory);

export default AvatarStory;
