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
