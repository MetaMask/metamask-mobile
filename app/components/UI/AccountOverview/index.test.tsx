import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountOverview from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

import Engine from '../../../core/Engine';

const mockedEngine = Engine;
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
        selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              // lowercase version for extra testing
              address: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
              id: '30313233-3435-4637-b839-383736353430',
              options: {},
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '30313233-3435-4637-b839-383736353430',
        },
      },
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
