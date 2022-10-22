/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarSize, AvatarVariants } from '../../Avatar2.types';

// Internal dependencies.
import AvatarImage from './AvatarImage';

storiesOf('Component Library / AvatarImage', module).add('Default', () => {
  const imageSource = {
    uri: 'https://uniswap.org/favicon.ico',
  };
  return (
    <AvatarImage
      variant={AvatarVariants.Image}
      imageSource={imageSource}
      size={AvatarSize.Md}
    />
  );
});
