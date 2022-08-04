/* eslint-disable no-console */
import React from 'react';
import { Alert } from 'react-native';
import { storiesOf } from '@storybook/react-native';

import { AvatarAccountType } from '../../Avatars/AvatarAccount';

import PickerAccount from './PickerAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_ACCOUNT_NAME,
} from './PickerAccount.constants';

storiesOf('Component Library / PickerAccount', module).add('Default', () => (
  <PickerAccount
    accountAddress={TEST_ACCOUNT_ADDRESS}
    accountName={TEST_ACCOUNT_NAME}
    accountAvatarType={AvatarAccountType.JazzIcon}
    onPress={() => Alert.alert('Pressed account picker!')}
  />
));
