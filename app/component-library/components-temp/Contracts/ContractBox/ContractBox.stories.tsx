// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import ContractBox from './ContractBox';
import {
  TOKEN_DESCRIPTION,
  CONTRACT_DESCRIPTION,
  TEST_ACCOUNT_ADDRESS,
  SAVED_TEST_ACCOUNT_ADDRESS,
} from './ContractBox.constants';
import { ContractType } from '../ContractBoxBase/ContractBase.types';

// Internal dependencies.

storiesOf('Component Library / ContractBox', module)
  .add('TokenView', () => (
    <ContractBox
      description={TOKEN_DESCRIPTION}
      address={TEST_ACCOUNT_ADDRESS}
      type={ContractType.token}
    />
  ))
  .add('ContractView', () => (
    <ContractBox
      description={CONTRACT_DESCRIPTION}
      type={ContractType.contract}
      address={TEST_ACCOUNT_ADDRESS}
    />
  ))
  .add('TokenView with saved contact', () => (
    <ContractBox
      description={TOKEN_DESCRIPTION}
      type={ContractType.token}
      address={SAVED_TEST_ACCOUNT_ADDRESS}
    />
  ))
  .add('ContractView with saved contact', () => (
    <ContractBox
      description={CONTRACT_DESCRIPTION}
      type={ContractType.contract}
      address={SAVED_TEST_ACCOUNT_ADDRESS}
    />
  ));
