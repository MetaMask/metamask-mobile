/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { TEST_REMOTE_IMAGE_SOURCE } from './BadgeNetwork.constants';
import { BadgeVariants } from '../../Badge.types';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';

storiesOf('Component Library / BadgeNetwork', module).add('Default', () => (
  <BadgeNetwork
    variant={BadgeVariants.Network}
    imageSource={TEST_REMOTE_IMAGE_SOURCE}
  />
));
