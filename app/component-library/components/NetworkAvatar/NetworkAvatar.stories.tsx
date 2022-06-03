import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';
import { NetworksChainId } from '@metamask/controllers';

storiesOf(' Component Library / NetworkAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const chainIdSelector = select(
      'chainId',
      NetworksChainId,
      NetworksChainId.mainnet,
    );

    return (
      <NetworkAvatar
        size={sizeSelector}
        chainId={chainIdSelector}
      />
    );
  });
