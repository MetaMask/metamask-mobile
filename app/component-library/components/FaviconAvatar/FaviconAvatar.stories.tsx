import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

import FaviconAvatar from '.';
import { AvatarSize } from '../../../component-library/components/BaseAvatar';

storiesOf('UI / FaviconAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const imageName = text('image file', 'fox.png');
    const imageUrl = `images/${imageName}`;

    const sizeSelector = select(
      'size',
      AvatarSize,
      AvatarSize.Md,
      'Avatar Size',
    );
    const sizeAsNumber = Number(sizeSelector);

    return <FaviconAvatar size={sizeAsNumber} imageUrl={imageUrl} />;
  });
