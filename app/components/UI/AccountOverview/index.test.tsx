import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountOverview from './';
import { backgroundState } from '../../../util/test/initial-root-state';

import Engine from '../../../core/Engine';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../util/test/accountsControllerTestUtils';

const mockedEngine = Engine;

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');

  return {
    init: () => mockedEngine.init(''),
    context: {
      KeyringController: {
        getQRKeyringState: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
              index: 0,
              type: KeyringTypes.hd,
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
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
