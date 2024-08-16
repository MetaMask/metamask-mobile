import React from 'react';
import { shallow } from 'enzyme';
import NetworkInfo from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  privacy: {
    approvedHosts: {},
  },
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

jest.mock('../../../core/Engine', () => ({
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

describe('NetworkInfo', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NetworkInfo
          type={''}
          onClose={function (): void {
            throw new Error('Function not implemented.');
          }}
          ticker={''}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
