/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarVariants, AvatarSize } from '../../Avatar2.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';

storiesOf('Component Library / AvatarIcon', module).add('Default', () => (
  <AvatarIcon
    variant={AvatarVariants.Icon}
    name={IconName.LockFilled}
    size={AvatarSize.Md}
  />
));
