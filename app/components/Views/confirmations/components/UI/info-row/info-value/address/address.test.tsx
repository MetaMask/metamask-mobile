import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../../../../../../util/test/accountsControllerTestUtils';

import Address from './address';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  },
};

describe('InfoAddress', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(
      <Address address={MOCK_ADDRESS_1} chainId={CHAIN_IDS.MAINNET} />,
      {
        state: mockInitialState,
      },
    );
    expect(container).toMatchSnapshot();
  });
});
