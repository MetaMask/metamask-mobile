import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Engine from '../../../core/Engine';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

const MOCK_ADDRESS = '0xe7E125654064EEa56229f273dA586F10DF96B0a1';

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

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS,
        identities: {
          [MOCK_ADDRESS]: {
            name: 'Account 1',
            address: MOCK_ADDRESS,
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  getTotalFiatAccountBalance: () => ({ ethFiat: 0, tokenFiat: 0 }),
  context: {
    NetworkController: {
      state: {
        providerConfig: { chainId: '0x1' },
      },
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

describe('DrawerView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <DrawerView navigation={{ goBack: () => null }} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
