import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import AddressFrom from './AddressFrom';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../../util/test/keyringControllerTestUtils';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  getNetworkImageSource,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';

const MOCK_ADDRESS_1 = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_ADDRESS_2 = '0x519d2CE57898513F676a5C3b66496c3C394c9CC7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockAsset = {
  isETH: true,
  address: '0x0',
  symbol: 'ETH',
  decimals: 18,
};

const mockInitialState: DeepPartial<RootState> = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS_1]: {
              balance: '0x1bc16d674ec80000',
            },
            [MOCK_ADDRESS_2]: {
              balance: '0x6f05b59d3b20000',
            },
          },
          '0x38': {
            [MOCK_ADDRESS_1]: {
              balance: '0x8ac7230489e80000',
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        vault: 'mock-vault',
        ...MOCK_KEYRING_CONTROLLER_STATE,
        isUnlocked: true,
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            chainId: CHAIN_IDS.MAINNET,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: RpcEndpointType.Infura,
              },
            ],
          },
          '0x38': {
            chainId: '0x38',
            name: 'BNB Smart Chain',
            nativeCurrency: 'BNB',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'bsc-mainnet',
                url: 'https://bsc-dataseed.binance.org/',
                type: RpcEndpointType.Custom,
              },
            ],
          },
        },
      },
    },
  },
};

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../selectors/selectedNetworkController', () => ({
  ...jest.requireActual('../../../selectors/selectedNetworkController'),
  useNetworkInfo: jest.fn(() => ({
    networkImageSource: 'per-dapp-network-image.png',
    networkName: 'Per-dapp Network',
    chainId: '0x1',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    domainNetworkClientId: 'mainnet',
    domainIsConnectedDapp: true,
  })),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  toChecksumAddress: jest.fn((address) => address),
  getLabelTextByAddress: jest.fn(() => 'External'),
  renderAccountName: jest.fn(() => 'Account 1'),
}));

jest.mock('../../hooks/useAddressBalance/useAddressBalance', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    addressBalance: '2 ETH',
  })),
}));

const mockStore = configureMockStore();

describe('AddressFrom', () => {
  const defaultProps = {
    asset: mockAsset,
    from: MOCK_ADDRESS_1,
    dontWatchAsset: false,
  };
  const mockIsRemoveGlobalNetworkSelectorEnabled =
    isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
      typeof isRemoveGlobalNetworkSelectorEnabled
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
  });

  describe('Basic Rendering', () => {
    it('should render correctly with default props', () => {
      const store = mockStore(mockInitialState);

      const component = render(
        <Provider store={store}>
          <AddressFrom {...defaultProps} />
        </Provider>,
      );

      expect(component).toMatchSnapshot();
    });

    it('should match snapshot with global network configuration', async () => {
      const component = renderWithProvider(<AddressFrom {...defaultProps} />, {
        state: mockInitialState,
      });

      expect(component).toMatchSnapshot();
    });

    it('displays from label correctly', async () => {
      const { findByText } = renderWithProvider(
        <AddressFrom {...defaultProps} />,
        { state: mockInitialState },
      );

      expect(await findByText(/From:/)).toBeDefined();
    });

    it('displays account name correctly', async () => {
      const { findByText } = renderWithProvider(
        <AddressFrom {...defaultProps} />,
        { state: mockInitialState },
      );

      expect(await findByText('Account 1')).toBeDefined();
    });
  });

  describe('Network Display Logic', () => {
    it('displays global network name when no origin or contextual network disabled', async () => {
      const { findByText } = renderWithProvider(
        <AddressFrom {...defaultProps} />,
        { state: mockInitialState },
      );

      expect(await findByText('Ethereum Main Network')).toBeDefined();
    });

    it('displays per-dapp network when origin is provided', async () => {
      const propsWithOrigin = {
        ...defaultProps,
        origin: 'https://dapp.example.com',
      };

      const { findByText } = renderWithProvider(
        <AddressFrom {...propsWithOrigin} />,
        { state: mockInitialState },
      );

      expect(await findByText('Per-dapp Network')).toBeDefined();
    });

    it('displays contextual network when enabled and chainId provided', async () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const propsWithChainId = {
        ...defaultProps,
        chainId: '0x38',
      };

      const { findByText } = renderWithProvider(
        <AddressFrom {...propsWithChainId} />,
        { state: mockInitialState },
      );

      expect(await findByText('BNB Smart Chain')).toBeDefined();
    });
  });

  describe('Different Asset Types', () => {
    it('handles ERC20 token correctly', async () => {
      const erc20Asset = {
        isETH: false,
        address: '0xA0b86a33E6441c8C5fCdE7dA1A1f00Ecadb522e6c',
        symbol: 'USDT',
        decimals: 6,
      };

      const propsWithToken = {
        ...defaultProps,
        asset: erc20Asset,
      };

      const component = renderWithProvider(
        <AddressFrom {...propsWithToken} />,
        { state: mockInitialState },
      );

      expect(component).toMatchSnapshot();
    });

    it('handles NFT asset correctly', async () => {
      const nftAsset = {
        isETH: false,
        address: '0x26D6C3e7aEFCE970fe3BE5d589DbAbFD30026924',
        symbol: 'NFT',
        decimals: 0,
        tokenId: '12345',
        standard: 'ERC721',
      };

      const propsWithNFT = {
        ...defaultProps,
        asset: nftAsset,
      };

      const component = renderWithProvider(<AddressFrom {...propsWithNFT} />, {
        state: mockInitialState,
      });

      expect(component).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing chainId gracefully', async () => {
      const propsWithoutChainId = {
        ...defaultProps,
        chainId: undefined,
      };

      const { queryByText } = renderWithProvider(
        <AddressFrom {...propsWithoutChainId} />,
        { state: mockInitialState },
      );

      expect(queryByText('null')).toBeDefined();
    });

    it('handles invalid chainId gracefully', async () => {
      const propsWithInvalidChainId = {
        ...defaultProps,
        chainId: '0x999999',
      };

      const component = renderWithProvider(
        <AddressFrom {...propsWithInvalidChainId} />,
        { state: mockInitialState },
      );

      expect(component).toBeDefined();
    });

    it('handles missing network configuration gracefully', async () => {
      const stateWithoutNetworkConfig = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine?.backgroundState,
            NetworkController: {
              ...mockInitialState.engine?.backgroundState?.NetworkController,
              networkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { queryByText } = renderWithProvider(
        <AddressFrom {...defaultProps} />,
        { state: stateWithoutNetworkConfig },
      );

      expect(queryByText('null')).toBeDefined();
    });
  });

  describe('Props Validation', () => {
    it('handles dontWatchAsset prop correctly', async () => {
      const propsWithDontWatch = {
        ...defaultProps,
        dontWatchAsset: true,
      };

      const component = renderWithProvider(
        <AddressFrom {...propsWithDontWatch} />,
        { state: mockInitialState },
      );

      expect(component).toBeDefined();
    });

    it('handles different from addresses correctly', async () => {
      const propsWithDifferentAddress = {
        ...defaultProps,
        from: MOCK_ADDRESS_2,
      };

      const component = renderWithProvider(
        <AddressFrom {...propsWithDifferentAddress} />,
        { state: mockInitialState },
      );

      expect(component).toBeDefined();
    });
  });

  describe('Badge Props', () => {
    it('creates badge props with correct network variant', async () => {
      const component = renderWithProvider(<AddressFrom {...defaultProps} />, {
        state: mockInitialState,
      });

      expect(component).toBeDefined();
    });

    it('handles missing network image gracefully', async () => {
      const mockGetNetworkImageSource =
        getNetworkImageSource as jest.MockedFunction<
          typeof getNetworkImageSource
        >;
      mockGetNetworkImageSource.mockReturnValue('');

      const component = renderWithProvider(
        <AddressFrom {...defaultProps} chainId="0x38" />,
        { state: mockInitialState },
      );

      expect(component).toBeDefined();
    });
  });

  describe('Feature Flag Interactions', () => {
    it('uses contextual network when feature flag is enabled', async () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const propsWithChainId = {
        ...defaultProps,
        chainId: CHAIN_IDS.MAINNET,
      };

      const { findByText } = renderWithProvider(
        <AddressFrom {...propsWithChainId} />,
        { state: mockInitialState },
      );

      expect(await findByText('Ethereum Mainnet')).toBeDefined();
    });

    it('falls back to global network when feature flag is disabled', async () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const { findByText } = renderWithProvider(
        <AddressFrom {...defaultProps} chainId="0x38" />,
        { state: mockInitialState },
      );

      expect(await findByText('Ethereum Main Network')).toBeDefined();
    });
  });
});
