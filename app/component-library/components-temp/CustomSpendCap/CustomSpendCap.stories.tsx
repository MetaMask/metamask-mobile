// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import {
  TICKER,
  ACCOUNT_BALANCE,
  DAPP_PROPOSED_VALUE,
  DAPP_DOMAIN,
} from './CustomSpendCap.constants';
import CustomSpendCap from './CustomSpendCap';

storiesOf('Component Library / CustomSpendCap', module).add('Default', () => (
  <CustomSpendCap
    ticker={TICKER}
    accountBalance={ACCOUNT_BALANCE}
    dappProposedValue={DAPP_PROPOSED_VALUE}
    domain={DAPP_DOMAIN}
  />
));
