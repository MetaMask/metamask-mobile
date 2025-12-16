import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import DeFiPositionsControlBar from './DeFiPositionsControlBar';
import { strings } from '../../../../locales/i18n';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isTestNet: jest.fn().mockReturnValue(false),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectIsAllNetworks: () => false,
  selectIsPopularNetwork: () => true,
  selectChainId: () => '0x1',
  selectPopularNetworkConfigurationsByCaipChainId: () => ({
    '0x1': {
      chainId: '0x1',
      nickname: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/',
      ticker: 'ETH',
      caipChainId: 'eip155:1',
    },
  }),
  selectCustomNetworkConfigurationsByCaipChainId: () => ({
    '0x89': {
      chainId: '0x89',
      nickname: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      ticker: 'MATIC',
      caipChainId: 'eip155:137',
    },
  }),
}));

jest.mock('../../../selectors/networkInfos', () => ({
  selectNetworkName: () => 'Ethereum Mainnet',
}));

jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: () => ({
    enabledNetworks: [{ chainId: '0x1' }, { chainId: '0x89' }],
    getNetworkInfo: jest.fn().mockReturnValue({
      networkName: 'Ethereum Mainnet',
    }),
  }),
}));

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      actionBarWrapper: {},
      controlButton: {},
      controlButtonDisabled: {},
      controlButtonText: {},
      controlIconButton: {},
    },
  }),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [],
    selectNetwork: jest.fn(),
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
  useNetworksByCustomNamespace: () => ({
    areAllNetworksSelected: false,
    totalEnabledNetworksCount: 2,
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../Tokens/TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: () => [
    'RootModalFlow',
    { screen: 'TokensBottomSheet' },
  ],
}));

jest.mock('../NetworkManager', () => ({
  createNetworkManagerNavDetails: () => [
    'RootModalFlow',
    { screen: 'NetworkManager' },
  ],
}));

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => null),
}));

const mockStore = configureMockStore();

describe('DeFiPositionsControlBar', () => {
  let store: ReturnType<typeof mockStore>;

  const createMockState = (overrides = {}) => ({
    engine: {
      backgroundState: {
        NetworkController: {
          provider: {
            chainId: CHAIN_IDS.MAINNET,
            type: 'mainnet',
          },
          networkConfigurations: {
            '0x1': {
              chainId: '0x1',
              nickname: 'Ethereum Mainnet',
              rpcUrl: 'https://mainnet.infura.io/v3/',
              ticker: 'ETH',
            },
            '0x89': {
              chainId: '0x89',
              nickname: 'Polygon',
              rpcUrl: 'https://polygon-rpc.com',
              ticker: 'MATIC',
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
        },
        PreferencesController: {
          selectedAddress: '0x123',
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    store = mockStore(createMockState());
    jest.clearAllMocks();
  });

  it('should render correctly with default state', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByTestId('defi-positions-network-filter')).toBeDefined();
  });

  it('shows enabled networks text when multiple networks enabled', () => {
    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText(strings('wallet.popular_networks'))).toBeDefined();
  });

  it('shows current network name when single network enabled', () => {
    const useCurrentNetworkInfoModule = jest.requireMock(
      '../../hooks/useCurrentNetworkInfo',
    );
    useCurrentNetworkInfoModule.useCurrentNetworkInfo = () => ({
      enabledNetworks: [{ chainId: '0x1' }],
      getNetworkInfo: jest.fn().mockReturnValue({
        networkName: 'Ethereum Mainnet',
      }),
    });

    const useNetworksByNamespaceModule = jest.requireMock(
      '../../hooks/useNetworksByNamespace/useNetworksByNamespace',
    );
    useNetworksByNamespaceModule.useNetworksByCustomNamespace = () => ({
      areAllNetworksSelected: false,
      totalEnabledNetworksCount: 1,
    });

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('shows current network fallback when no network name', () => {
    const useCurrentNetworkInfoModule = jest.requireMock(
      '../../hooks/useCurrentNetworkInfo',
    );
    useCurrentNetworkInfoModule.useCurrentNetworkInfo = () => ({
      enabledNetworks: [{ chainId: '0x1' }],
      getNetworkInfo: jest.fn().mockReturnValue(null),
    });

    const useNetworksByNamespaceModule = jest.requireMock(
      '../../hooks/useNetworksByNamespace/useNetworksByNamespace',
    );
    useNetworksByNamespaceModule.useNetworksByCustomNamespace = () => ({
      areAllNetworksSelected: false,
      totalEnabledNetworksCount: 1,
    });

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText(strings('wallet.current_network'))).toBeDefined();
  });

  it('navigates to network manager when filter button is pressed', () => {
    const mockNavigation = {
      navigate: jest.fn(),
    };

    const navigationModule = jest.requireMock('@react-navigation/native');
    navigationModule.useNavigation = () => mockNavigation;

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    fireEvent.press(filterButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkManager',
      }),
    );
  });

  it('should be disabled when on testnet', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isTestNet.mockReturnValue(true);

    const mockState = createMockState({
      engine: {
        backgroundState: {
          NetworkController: {
            provider: {
              chainId: CHAIN_IDS.GOERLI,
              type: 'goerli',
            },
          },
          MultichainNetworkController: {
            isEvmSelected: true,
          },
          PreferencesController: {
            selectedAddress: '0x123',
          },
        },
      },
    });

    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    expect(filterButton.props.disabled).toBe(true);
  });

  it('should be disabled when not on popular network', () => {
    const networkControllerModule = jest.requireMock(
      '../../../selectors/networkController',
    );
    networkControllerModule.selectIsPopularNetwork = () => false;

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    expect(filterButton.props.disabled).toBe(true);
  });

  it('should render sort button with filter icon', () => {
    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByTestId('defi-positions-network-filter')).toBeDefined();
  });
});
