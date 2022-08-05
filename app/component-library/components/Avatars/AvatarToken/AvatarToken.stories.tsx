// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import { TEST_TOKEN_IMAGES } from './AvatarToken.constants';

const groupId = 'props';

storiesOf(' Component Library / AvatarToken', module)
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
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const imageUrlSelector = select(
      'tokenImageUrl',
      TEST_TOKEN_IMAGES,
      TEST_TOKEN_IMAGES[0],
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return (
      <AvatarToken
        size={sizeSelector}
        tokenName={tokenNameSelector}
        tokenImageUrl={imageUrlSelector}
      />
    );
  })
  .add('With image & halo effect', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const imageUrlSelector = select(
      'tokenImageUrl',
      TEST_TOKEN_IMAGES,
      TEST_TOKEN_IMAGES[0],
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return (
      <AvatarToken
        size={sizeSelector}
        tokenName={tokenNameSelector}
        tokenImageUrl={imageUrlSelector}
        showHalo
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const tokenNameSelector = text('tokenName', 'Ethereum', groupId);

    return <AvatarToken size={sizeSelector} tokenName={tokenNameSelector} />;
  })
  .add('Without image and tokenName', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);

    return <AvatarToken size={sizeSelector} />;
  });
