/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarSize } from '../../../../Avatar2.types';

// Internal dependencies.
import AvatarAssetImage from './AvatarAssetImage';

storiesOf('Component Library / AvatarAssetImage', module).add('Default', () => {
  const imageSource = {
    uri: 'https://uniswap.org/favicon.ico',
  };
  return (
    <AvatarAssetImage
      variant={AvatarAssetVariants.Image}
      imageSource={imageSource}
      size={AvatarSize.Md}
    />
  );
});
