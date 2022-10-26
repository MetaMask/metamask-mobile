/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { TEST_REMOTE_IMAGE_SOURCE } from './variants/BadgeNetwork/BadgeNetwork.constants';
import { BadgeVariants } from './Badge.types';

// Internal dependencies.
import Badge from './Badge';

storiesOf('Component Library / Badge', module).add('Default', () => (
  <Badge
    variant={BadgeVariants.Network}
    imageSource={TEST_REMOTE_IMAGE_SOURCE}
  />
));
