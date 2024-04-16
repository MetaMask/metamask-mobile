import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Engine from '../../../core/Engine';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
        identities: {
          '0xe7E125654064EEa56229f273dA586F10DF96B0a1': {
            name: 'Account 1',
            address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              address: '0xe7e125654064eea56229f273da586f10df96b0a1',
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
