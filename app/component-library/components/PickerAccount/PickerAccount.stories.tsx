/* eslint-disable no-console */
import React from 'react';
import { Alert } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import PickerAccount from './PickerAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_ACCOUNT_NAME,
} from './PickerAccount.constants';
import { AccountAvatarType } from '../AccountAvatar';

storiesOf('Component Library / PickerAccount', module).add('Default', () => (
  <PickerAccount
    accountAddress={TEST_ACCOUNT_ADDRESS}
    accountName={TEST_ACCOUNT_NAME}
    accountAvatarType={AccountAvatarType.JazzIcon}
    onPress={() => Alert.alert('Pressed account picker!')}
  />
));
