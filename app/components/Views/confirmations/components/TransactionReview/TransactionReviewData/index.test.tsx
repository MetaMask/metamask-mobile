import React from 'react';
import TransactionReviewData from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));
const initialState = {
  engine: {
    ...backgroundState,
    NetworkController: {
      networkConfigurations: {
        '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
          id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      },
      selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
      networksMetadata: {},
    },
  },
  transaction: {
    transaction: {
      data: '',
    },
    value: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewData', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewData />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
