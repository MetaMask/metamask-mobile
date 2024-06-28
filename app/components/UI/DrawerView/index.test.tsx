import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../util/test/accountsControllerTestUtils';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS_1,
        identities: {
          [MOCK_ADDRESS_1]: {
            name: 'Account 1',
            address: MOCK_ADDRESS_1,
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
