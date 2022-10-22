/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarSize, AvatarVariants } from '../../Avatar2.types';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';

storiesOf('Component Library / AvatarJazzIcon', module).add('Default', () => (
  <AvatarJazzIcon
    variant={AvatarVariants.JazzIcon}
    address="0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092"
    size={AvatarSize.Md}
  />
));
