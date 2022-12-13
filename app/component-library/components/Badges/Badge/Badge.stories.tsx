/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import {
  TEST_REMOTE_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { BadgeVariants } from './Badge.types';

// Internal dependencies.
import Badge from './Badge';

storiesOf('Component Library / Badge', module).add('Default', () => (
  <Badge
    variant={BadgeVariants.Network}
    name={TEST_NETWORK_NAME}
    imageSource={TEST_REMOTE_IMAGE_SOURCE}
  />
));
