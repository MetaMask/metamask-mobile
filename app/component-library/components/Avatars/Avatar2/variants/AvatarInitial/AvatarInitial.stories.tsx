/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarSize, AvatarVariants } from '../../Avatar2.types';

// Internal dependencies.
import AvatarInitial from './AvatarInitial';

storiesOf('Component Library / AvatarInitial', module).add('Default', () => (
  <AvatarInitial
    variant={AvatarVariants.Initial}
    initial="Brian"
    size={AvatarSize.Md}
  />
));
