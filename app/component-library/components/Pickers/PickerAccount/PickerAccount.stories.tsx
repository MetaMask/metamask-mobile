/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import PickerAccount from './PickerAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_ACCOUNT_NAME,
} from './PickerAccount.constants';
import { AvatarAccountType } from './PickerAccount.types';

storiesOf('Component Library / PickerAccount', module).add('Default', () => (
  <PickerAccount
    accountAddress={TEST_ACCOUNT_ADDRESS}
    accountName={TEST_ACCOUNT_NAME}
    accountAvatarType={AvatarAccountType.JazzIcon}
    onPress={() => Alert.alert('Pressed account picker!')}
  />
));
