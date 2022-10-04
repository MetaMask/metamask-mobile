/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import AvatarAccountStory from './variants/AvatarAccount/AvatarAccount.stories';
import AvatarFaviconStory from './variants/AvatarFavicon/AvatarFavicon.stories';
import AvatarIconStory from './variants/AvatarIcon/AvatarIcon.stories';
import AvatarNetworkStory from './variants/AvatarNetwork/AvatarNetwork.stories';
import AvatarTokenStory from './variants/AvatarToken/AvatarToken.stories';

// Internal dependencies.
import { AvatarVariants } from './Avatar.types';

const AvatarStory = () => {
  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariants,
    AvatarVariants.Account,
    storybookPropsGroupID,
  );
  switch (avatarVariantsSelector) {
    case AvatarVariants.Account:
      return <AvatarAccountStory />;
      break;
    case AvatarVariants.Favicon:
      return <AvatarFaviconStory />;
      break;
    case AvatarVariants.Icon:
      return <AvatarIconStory />;
      break;
    case AvatarVariants.Network:
      return <AvatarNetworkStory />;
      break;
    case AvatarVariants.Token:
      return <AvatarTokenStory />;
      break;
  }
};

storiesOf('Component Library / Avatar', module)
  .add('Default', AvatarStory)
  .add('Variants / AvatarAccount', AvatarAccountStory)
  .add('Variants / AvatarIcon', AvatarIconStory)
  .add('Variants / AvatarNetwork', AvatarNetworkStory)
  .add('Variants / AvatarToken', AvatarTokenStory);
