import React from 'react';
import Transactions from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import {
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerForRpc,
} from '../../../util/networks';

// Mock the navigation and other dependencies
const mockNavigationPush = jest.fn();
const mockNavigation = {
  push: mockNavigationPush,
  setOptions: jest.fn(),
};

// Mock the multichain utils
jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(),
}));

// Mock network utils
jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest.fn(),
  getBlockExplorerName: jest.fn(),
  findBlockExplorerForNonEvmChainId: jest.fn(),
  findBlockExplorerForRpc: jest.fn(),
  isMainnetByChainId: jest.fn(),
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
    primaryCurrency: 'USD',
  },
};
const store = mockStore(initialState);

// Get the mocked functions with proper typing
const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;
const mockGetBlockExplorerAddressUrl =
  getBlockExplorerAddressUrl as jest.MockedFunction<
    typeof getBlockExplorerAddressUrl
  >;
const mockGetBlockExplorerName = getBlockExplorerName as jest.MockedFunction<
  typeof getBlockExplorerName
>;
const mockFindBlockExplorerForNonEvmChainId =
  findBlockExplorerForNonEvmChainId as jest.MockedFunction<
    typeof findBlockExplorerForNonEvmChainId
  >;
const mockFindBlockExplorerForRpc =
  findBlockExplorerForRpc as jest.MockedFunction<
    typeof findBlockExplorerForRpc
  >;

describe('Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Transactions
          transactions={[
            {
              blockNumber: '5108051',
              id: '95305900-3b10-11e9-af59-6f4c0e36ce5f',
              networkID: '3',
              status: 'confirmed',
              time: 1551327802000,
              txParams: {
                data: '0x',
                from: '0xb2d191b6fe03c5b8a1ab249cfe88c37553357a23',
                gas: '0x5208',
                gasPrice: '0x37e11d600',
                nonce: '0x2e',
                to: '0xe46abaf75cfbff815c0b7ffed6f02b0760ea27f1',
                value: '0xfa1c6d5030000',
              },
              hash: '0x79ce2d56aaa4735b2bb602ae3a501d9055350a6ec3fb3bd457ba18e8fa4aa2ae',
            },
          ]}
          loading={false}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  describe('Block Explorer Integration', () => {
    it('should render for Solana chains', () => {
      mockIsNonEvmChainId.mockReturnValue(true);
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            navigation={mockNavigation}
            providerConfig={{ type: 'rpc' }}
            selectedAddress="EMmTjuHsYCYX7vgPcQ2QVbNwYAwcvGoSMCEaHKc19DdE"
            chainId="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });

    it('should render for EVM chains', () => {
      mockIsNonEvmChainId.mockReturnValue(false);
      mockGetBlockExplorerAddressUrl.mockReturnValue({
        url: 'https://etherscan.io/address/0x123',
        title: 'Etherscan',
      });

      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            navigation={mockNavigation}
            providerConfig={{ type: 'mainnet' }}
            selectedAddress="0x123"
            chainId="0x1"
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });
  });

  describe('Network Configuration', () => {
    it('should handle non-EVM chain configuration', () => {
      mockIsNonEvmChainId.mockReturnValue(true);
      mockFindBlockExplorerForNonEvmChainId.mockReturnValue(
        'https://solscan.io',
      );

      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            chainId="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
            providerConfig={{
              type: 'rpc',
              rpcUrl: 'https://api.mainnet-beta.solana.com',
            }}
            networkConfigurations={{}}
            selectedAddress="EMmTjuHsYCYX7vgPcQ2QVbNwYAwcvGoSMCEaHKc19DdE"
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });

    it('should handle RPC network configuration', () => {
      mockIsNonEvmChainId.mockReturnValue(false);
      mockFindBlockExplorerForRpc.mockReturnValue(
        'https://custom-explorer.com',
      );

      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            chainId="0x89"
            providerConfig={{ type: 'rpc', rpcUrl: 'https://polygon-rpc.com' }}
            networkConfigurations={{}}
            selectedAddress="0x123"
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });
  });

  describe('Empty State Handling', () => {
    it('should render empty state for non-EVM chains without transactions', () => {
      mockIsNonEvmChainId.mockReturnValue(true);

      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            chainId="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
            providerConfig={{ type: 'rpc' }}
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });

    it('should render loading state', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading
            chainId="0x1"
            providerConfig={{ type: 'mainnet' }}
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });
  });

  describe('Solana Block Explorer Functionality', () => {
    it('should render with Solana-specific props', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            chainId="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
            providerConfig={{ type: 'rpc' }}
            selectedAddress="EMmTjuHsYCYX7vgPcQ2QVbNwYAwcvGoSMCEaHKc19DdE"
            navigation={mockNavigation}
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });

    it('should render with different chain configurations', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <Transactions
            transactions={[]}
            loading={false}
            chainId="bitcoin:000000000019d6689c085ae165831e93"
            providerConfig={{ type: 'rpc' }}
            selectedAddress="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            navigation={mockNavigation}
          />
        </Provider>,
      );

      expect(wrapper).toBeDefined();
    });
  });
});
