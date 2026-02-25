import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TokenListControlBar } from './TokenListControlBar';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNavigation } from '@react-navigation/native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';

// Mock the feature flag
jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

// Mock the useCurrentNetworkInfo hook
jest.mock('../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const stableNullAccountSelector = () => null;
  return {
    selectSelectedInternalAccountByScope: () => stableNullAccountSelector,
  };
});

// Mock the useNetworksByNamespace hooks
jest.mock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
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
  }),
);

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => ({
    enableAllPopularNetworks: jest.fn(),
  })),
}));

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock the navigation functions
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

// Mock the useCurrentNetworkInfo hook
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;

// Mock the useNavigation hook
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock the navigation details creators
jest.mock('../TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn(() => ['NetworkManager', {}]),
}));

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock the selectors (BaseControlBar uses selectNetworkName)
const mockSelectNetworkName = jest.fn();

jest.mock('../../../../selectors/networkInfos', () => ({
  selectNetworkName: () => mockSelectNetworkName(),
}));

// Mock the theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#ffffff' },
      text: { default: '#000000' },
      border: { muted: '#e0e0e0' },
    },
  }),
}));

const mockStore = configureMockStore();

describe('TokenListControlBar', () => {
  const defaultProps = {
    goToAddToken: jest.fn(),
  };

  const defaultState = {
    engine: {
      backgroundState: {
        NetworkController: {
          isAllNetworks: false,
          isPopularNetwork: false,
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Ethereum Mainnet',
              nativeCurrency: { symbol: 'ETH' },
              rpcEndpoints: [
                {
                  url: 'https://mainnet.infura.io/v3/123',
                  networkClientId: 'mainnet',
                  type: 'custom',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
            '0x89': {
              chainId: '0x89',
              name: 'Polygon',
              nativeCurrency: { symbol: 'MATIC' },
              rpcEndpoints: [
                {
                  url: 'https://polygon-rpc.com',
                  networkClientId: 'polygon',
                  type: 'custom',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
          },
          selectedNetworkClientId: 'mainnet',
        },
        MultichainNetworkController: {
          isEvmNetworkSelected: true,
        },
        NetworkInfosController: {
          networkName: 'Ethereum Mainnet',
        },
        PreferencesController: {
          tokenNetworkFilter: {
            '0x1': true,
            '0x89': true,
          },
        },
      },
    },
  };

  const defaultNetworkInfo = {
    enabledNetworks: [
      { chainId: '1', enabled: true },
      { chainId: '137', enabled: true },
    ],
    getNetworkInfo: jest.fn((index: number = 0) => {
      const networks = [
        { caipChainId: 'eip155:1', networkName: 'Ethereum Mainnet' },
        { caipChainId: 'eip155:137', networkName: 'Polygon' },
      ];
      return networks[index] || null;
    }),
    getNetworkInfoByChainId: jest.fn((chainId: string) => {
      const networks: Record<
        string,
        { caipChainId: string; networkName: string }
      > = {
        '1': { caipChainId: 'eip155:1', networkName: 'Ethereum Mainnet' },
        '137': { caipChainId: 'eip155:137', networkName: 'Polygon' },
      };
      return networks[chainId] || null;
    }),
    isDisabled: false,
    hasEnabledNetworks: true,
    isNetworkEnabledForDefi: true,
    hasMultipleNamespacesEnabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');
  });

  const renderComponent = (props = {}, state = {}) => {
    const store = mockStore({ ...defaultState, ...state });
    return render(
      <Provider store={store}>
        <TokenListControlBar {...defaultProps} {...props} />
      </Provider>,
    );
  };

  describe('Network Manager Integration', () => {
    describe('Core Functionality', () => {
      it('navigates to NetworkManager when filter button is pressed', () => {
        const { getByTestId } = renderComponent();

        const filterButton = getByTestId(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
        );
        fireEvent.press(filterButton);

        expect(mockNavigate).toHaveBeenCalledWith('NetworkManager', {});
      });

      it('shows current network name when only one network is enabled', () => {
        const singleNetworkInfo = {
          enabledNetworks: [{ chainId: '1', enabled: true }],
          getNetworkInfo: jest.fn(() => ({
            caipChainId: 'eip155:1',
            networkName: 'Ethereum Mainnet',
          })),
          getNetworkInfoByChainId: jest.fn(() => ({
            caipChainId: 'eip155:1',
            networkName: 'Ethereum Mainnet',
          })),
          isDisabled: false,
          hasEnabledNetworks: true,
          isNetworkEnabledForDefi: true,
          hasMultipleNamespacesEnabled: false,
        };
        mockUseCurrentNetworkInfo.mockReturnValue(singleNetworkInfo);

        const useNetworksByNamespaceModule = jest.requireMock(
          '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
        );
        useNetworksByNamespaceModule.useNetworksByCustomNamespace = () => ({
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 1,
        });

        const { getByText } = renderComponent();

        expect(getByText('Ethereum Mainnet')).toBeTruthy();
      });

      it('shows fallback text when no network info is available', () => {
        const noNetworkInfo = {
          enabledNetworks: [],
          getNetworkInfo: jest.fn(() => null),
          getNetworkInfoByChainId: jest.fn(() => null),
          isDisabled: false,
          hasEnabledNetworks: false,
          isNetworkEnabledForDefi: false,
          hasMultipleNamespacesEnabled: false,
        };
        mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);

        const useNetworksByNamespaceModule = jest.requireMock(
          '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
        );
        useNetworksByNamespaceModule.useNetworksByCustomNamespace = () => ({
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 1,
        });

        const { getByText } = renderComponent();

        expect(getByText('wallet.current_network')).toBeTruthy();
      });

      it('shows "Popular Networks" text when multiple networks are enabled', () => {
        const useNetworksByNamespaceModule = jest.requireMock(
          '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
        );
        useNetworksByNamespaceModule.useNetworksByCustomNamespace = () => ({
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 2,
        });

        const { getByText } = renderComponent();

        expect(getByText('wallet.popular_networks')).toBeTruthy();
      });
    });
  });

  describe('Button interactions', () => {
    it('calls goToAddToken when add token button is pressed', () => {
      const goToAddToken = jest.fn();
      const { getByTestId } = renderComponent({ goToAddToken });

      const addTokenButton = getByTestId('import-token-button');
      fireEvent.press(addTokenButton);

      expect(goToAddToken).toHaveBeenCalled();
    });
  });

  describe('Button states', () => {
    it('does not disable filter button by default', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );

      expect(filterButton.props.disabled).toBe(false);
    });

    it('renders add token button as enabled', () => {
      const { getByTestId } = renderComponent();
      const addTokenButton = getByTestId('import-token-button');

      expect(addTokenButton.props.disabled).toBe(false);
    });
  });
});
