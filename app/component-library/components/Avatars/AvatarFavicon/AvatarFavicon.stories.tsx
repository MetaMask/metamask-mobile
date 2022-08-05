// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import { TEST_IMAGE_URL } from './AvatarFavicon.constants';

storiesOf('Component Library / AvatarFavicon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      'Avatar Size',
    );

    return <AvatarFavicon size={sizeSelector} imageUrl={TEST_IMAGE_URL} />;
  })
  .add('With Error', () => {
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      'Avatar Size',
    );

    return <AvatarFavicon size={sizeSelector} imageUrl={''} />;
  });
