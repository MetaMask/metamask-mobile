import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountOverview from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

import Engine from '../../../core/Engine';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../util/test/accountsControllerTestUtils';

const mockedEngine = Engine;

jest.mock('../../../core/Engine.ts', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
            index: 0,
            type: 'HD Key Tree',
          },
        ],
      },
    },
  },
}));

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS_1,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('AccountOverview', () => {
  it('should render correctly', () => {
    const account = {
      address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      balanceFiat: 1604.2,
      label: 'Account 1',
    };
    const { toJSON } = renderWithProvider(
      <AccountOverview account={account} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
