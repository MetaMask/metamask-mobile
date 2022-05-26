import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';
import { NetworksChainId } from '@metamask/controllers';
import { BaseTextVariant } from '../BaseText';

storiesOf(' Component Library / NetworkAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const chainIdSelector = select(
      'chainId',
      NetworksChainId,
      NetworksChainId.mainnet,
    );
    const textVariant = select(
      'textVariant',
      BaseTextVariant,
      BaseTextVariant.lDisplayMD,
    );

    return (
      <NetworkAvatar
        size={sizeSelector}
        textVariant={textVariant}
        chainId={chainIdSelector}
      />
    );
  });
