import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { AvatarSize } from '../Avatar';
import FaviconAvatar from '.';
import { testImageUrl } from './FaviconAvatar.data';

storiesOf('Component Library / FaviconAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select(
      'size',
      AvatarSize,
      AvatarSize.Md,
      'Avatar Size',
    );

    return <FaviconAvatar size={sizeSelector} imageUrl={testImageUrl} />;
  })
  .add('With Error', () => {
    const sizeSelector = select(
      'size',
      AvatarSize,
      AvatarSize.Md,
      'Avatar Size',
    );

    return <FaviconAvatar size={sizeSelector} imageUrl={''} />;
  });
