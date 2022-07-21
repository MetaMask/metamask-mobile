import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import TokenAvatar from '.';
import { View } from 'react-native';

const someTokenImages = [
  'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'https://cryptologos.cc/logos/chainlink-link-logo.png',
  'https://cryptologos.cc/logos/decentraland-mana-logo.png',
  'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png',
  'https://cryptologos.cc/logos/vechain-vet-logo.png',
];

const groupId = 'props';

storiesOf(' Component Library / TokenAvatar', module)
  // Component centered container
  .addDecorator((storyFn) => (
    //  eslint-disable-next-line
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      {storyFn()}
    </View>
  ))
  .add('With image', () => {
    const sizeSelector = select(
      'size',
      BaseAvatarSize,
      BaseAvatarSize.Md,
      groupId,
    );
    const imageUrlSelector = select(
      'tokenImageUrl',
      someTokenImages,
      someTokenImages[0],
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return (
      <TokenAvatar
        size={sizeSelector}
        tokenName={tokenNameSelector}
        tokenImageUrl={imageUrlSelector}
      />
    );
  })
  .add('With image & halo effect', () => {
    const sizeSelector = select(
      'size',
      BaseAvatarSize,
      BaseAvatarSize.Md,
      groupId,
    );
    const imageUrlSelector = select(
      'tokenImageUrl',
      someTokenImages,
      someTokenImages[0],
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return (
      <TokenAvatar
        size={sizeSelector}
        tokenName={tokenNameSelector}
        tokenImageUrl={imageUrlSelector}
        showHalo
        haloColor={'#00000050'}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select(
      'size',
      BaseAvatarSize,
      BaseAvatarSize.Md,
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return <TokenAvatar size={sizeSelector} tokenName={tokenNameSelector} />;
  })
  .add('Without image and tokenName', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);

    return <TokenAvatar size={sizeSelector} />;
  });
