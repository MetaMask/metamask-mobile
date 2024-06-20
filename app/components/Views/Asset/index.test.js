import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Asset from './';
import Engine from '../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine.ts', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    init: () => mockedEngine.init({}),
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: () => null }}
        route={{ params: { symbol: 'ETH', address: 'something', isETH: true } }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
