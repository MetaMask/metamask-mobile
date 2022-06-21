import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';
// import { NetworksChainId } from '@metamask/controllers';

storiesOf(' Component Library / NetworkAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('With image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');
    const networkImage = require('../../../images/eth-logo.png');
    // const chainIdSelector = select(
    //   'chainId',
    //   NetworksChainId,
    //   NetworksChainId.mainnet,
    // );

    return (
      <NetworkAvatar
        size={sizeSelector}
        networkName={networkNameSelector}
        networkImage={networkImage}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <NetworkAvatar size={sizeSelector} networkName={networkNameSelector} />
    );
  });
