/* eslint-disable no-console, react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { IconName, IconSize } from '../../../../../../Icon';

// Internal dependencies.
import AvatarAssetIcon from './AvatarAssetIcon';

storiesOf('Component Library / AvatarAssetIcon', module).add('Default', () => (
  <AvatarAssetIcon
    variant={AvatarAssetVariants.Icon}
    name={IconName.LockFilled}
    size={IconSize.Md}
  />
));
