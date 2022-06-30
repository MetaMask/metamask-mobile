import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import TokenAvatar from '.';
import { View } from 'react-native';

const testImageUrl = '';

storiesOf(' Component Library / TokenAvatar', module)
  // Component centered container
  .addDecorator((storyFn) => (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      {storyFn()}
    </View>
  ))
  .add('With image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const tokenNameSelector = text('tokenName', 'Ethereum');

    return (
      <TokenAvatar
        size={sizeSelector}
        tokenName={tokenNameSelector}
        tokenImageUrl={testImageUrl}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const tokenNameSelector = text('tokenName', 'Ethereum');

    return <TokenAvatar size={sizeSelector} tokenName={tokenNameSelector} />;
  })
  .add('Without image and tokenName', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);

    return <TokenAvatar size={sizeSelector} />;
  })
  .add('With halo effect', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);

    return <TokenAvatar size={sizeSelector} />;
  });
