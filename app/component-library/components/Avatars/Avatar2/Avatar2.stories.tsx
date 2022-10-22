/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarSize, AvatarVariants } from './Avatar2.types';

// Internal dependencies.
import Avatar2 from './Avatar2';

storiesOf('Component Library / Avatar2', module).add('Default', () => (
  <Avatar2
    variant={AvatarVariants.Initial}
    initial="Brian"
    size={AvatarSize.Md}
  />
));
