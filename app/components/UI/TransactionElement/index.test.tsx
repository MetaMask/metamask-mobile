import React from 'react';
import TransactionElement from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
      setActiveNetwork: jest.fn(),
    },
    TokenListController: {
      state: {
        tokensChainsCache: {
          '0x1': {
            data: [],
          },
        },
      },
    },
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};
const store = mockStore(initialState);

describe('TransactionElement', () => {
  it('should render correctly 1', () => {
    const component = renderWithProvider(
      <Provider store={store}>
        <TransactionElement
          tx={{
            transaction: {
              to: '0x0',
              from: '0x1',
              nonce: 1,
            },
            chainId: '0x1',
            txParams: {
              to: '0x0',
              from: '0x1',
              status: 'CONFIRMED',
            },
          }}
        />
      </Provider>,
    );
    expect(component).toMatchSnapshot();
  });
});
