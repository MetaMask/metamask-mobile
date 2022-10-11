/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarSize } from '../../../../Avatar2.types';

// Internal dependencies.
import AvatarAssetJazzIcon from './AvatarAssetJazzIcon';

storiesOf('Component Library / AvatarAssetJazzIcon', module).add(
  'Default',
  () => (
    <AvatarAssetJazzIcon
      variant={AvatarAssetVariants.JazzIcon}
      address="0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092"
      size={Number(AvatarSize.Md)}
    />
  ),
);
