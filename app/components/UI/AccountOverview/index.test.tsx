import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountOverview from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

import Engine from '../../../core/Engine';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

const mockedEngine = Engine;

const MOCK_ADDRESS = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS.toLowerCase(),
  'Account 1',
);

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUUID]: internalAccount1,
    },
    selectedAccount: expectedUUID,
  },
};

jest.mock('../../../core/Engine.ts', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
      state: {
        keyrings: [
          {
            accounts: ['0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3'],
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
        selectedAddress: MOCK_ADDRESS,
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
