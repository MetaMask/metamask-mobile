// Third party dependencies.
import React from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import { TEST_TOKEN_IMAGES } from './AvatarToken.constants';

const groupId = 'props';
const networkName = 'Ethereum';

storiesOf('Component Library / AvatarToken', module)
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
    const includesImage = boolean('Includes image', false, groupId);
    const imageUrlSelector = select(
      'image.uri',
      TEST_TOKEN_IMAGES,
      TEST_TOKEN_IMAGES[0],
      groupId,
    );
    const image = (includesImage && {
      uri: imageUrlSelector,
    }) as ImageSourcePropType;
    const tokenNameSelector = text('name', networkName, groupId);

    return (
      <AvatarToken size={sizeSelector} name={tokenNameSelector} image={image} />
    );
  })
  .add('With image & halo effect', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const includesImage = boolean('Includes image', false, groupId);
    const imageUrlSelector = select(
      'iamge.uri',
      TEST_TOKEN_IMAGES,
      TEST_TOKEN_IMAGES[0],
      groupId,
    );
    const image = (includesImage && {
      uri: imageUrlSelector,
    }) as ImageSourcePropType;
    const tokenNameSelector = text('name', networkName, groupId);

    return (
      <AvatarToken
        size={sizeSelector}
        name={tokenNameSelector}
        image={image}
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
    const tokenNameSelector = text('name', networkName, groupId);

    return <AvatarToken size={sizeSelector} name={tokenNameSelector} />;
  })
  .add('Without image and name', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);

    return <AvatarToken size={sizeSelector} />;
  });
