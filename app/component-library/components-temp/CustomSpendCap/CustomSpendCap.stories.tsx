// Third party dependencies.
import React from 'react';

import { storiesOf } from '@storybook/react-native';

import CustomSpendCap from './CustomSpendCap';
// Internal dependencies.
import {
  ACCOUNT_BALANCE,
  DAPP_DOMAIN,
  DAPP_PROPOSED_VALUE,
  INPUT_VALUE_CHANGED,
  TICKER,
} from './CustomSpendCap.constants';

storiesOf('Component Library / CustomSpendCap', module).add('Default', () => (
  <CustomSpendCap
    ticker={TICKER}
    accountBalance={ACCOUNT_BALANCE}
    dappProposedValue={DAPP_PROPOSED_VALUE}
    domain={DAPP_DOMAIN}
    onInputChanged={INPUT_VALUE_CHANGED}
    isEditDisabled={false}
    editValue={() => undefined}
    tokenSpendValue={''}
    toggleLearnMoreWebPage={() => undefined}
  />
));
