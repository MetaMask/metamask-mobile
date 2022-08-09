// Third party dependencies.
import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import { TEST_IMAGE_URL } from './AvatarFavicon.constants';

const groupId = 'Props';

storiesOf('Component Library / AvatarFavicon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const imageUrl = text('imageSource.uri', TEST_IMAGE_URL, groupId);
    const imageSource: ImageSourcePropType = {
      uri: imageUrl,
    };

    return <AvatarFavicon size={sizeSelector} imageSource={imageSource} />;
  })
  .add('With Error', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      'Avatar Size',
    );

    return <AvatarFavicon size={sizeSelector} imageSource={{ uri: '' }} />;
  });
