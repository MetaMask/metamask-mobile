import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

import FaviconAvatar from '.';
import { BaseAvatarSize } from '../BaseAvatar';

storiesOf('Component Library / FaviconAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const imageName = text('image file', 'fox.png');
    const imageUrl = `images/${imageName}`;

    const sizeSelector = select(
      'size',
      BaseAvatarSize,
      BaseAvatarSize.Md,
      'Avatar Size',
    );

    return <FaviconAvatar size={sizeSelector} imageUrl={imageUrl} />;
  });
