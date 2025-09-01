import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TokenListControlBar } from './TokenListControlBar';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNavigation } from '@react-navigation/native';

// Mock the feature flag
jest.mock('../../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
  getNetworkImageSource: jest.fn(),
}));

// Mock the useCurrentNetworkInfo hook
jest.mock('../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
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

// Mock the feature flag function
const mockIsRemoveGlobalNetworkSelectorEnabled =
  isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
    typeof isRemoveGlobalNetworkSelectorEnabled
  >;

// Mock the useNavigation hook
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock the navigation details creators
jest.mock('../TokensBottomSheet', () => ({
  createTokenBottomSheetFilterNavDetails: jest.fn(() => ['TokenFilter', {}]),
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn(() => ['NetworkManager', {}]),
}));

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock the selectors
const mockSelectIsAllNetworks = jest.fn();
const mockSelectIsPopularNetwork = jest.fn();
const mockSelectIsEvmNetworkSelected = jest.fn();
const mockSelectNetworkName = jest.fn();
const mockSelectChainId = jest.fn();

jest.mock('../../../../selectors/networkController', () => ({
  selectIsAllNetworks: () => mockSelectIsAllNetworks(),
  selectIsPopularNetwork: () => mockSelectIsPopularNetwork(),
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
  selectChainId: () => mockSelectChainId(),
}));

jest.mock('../../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: () => mockSelectIsEvmNetworkSelected(),
}));

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

// Mock the styles
jest.mock('../styles', () => ({
  __esModule: true,
  default: () => ({
    actionBarWrapper: {},
    controlButtonOuterWrapper: {},
    controlButtonInnerWrapper: {},
    controlButton: {},
    controlButtonDisabled: {},
    controlButtonText: {},
    controlIconButton: {},
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

    // Reset selector mocks
    mockSelectIsAllNetworks.mockReturnValue(false);
    mockSelectIsPopularNetwork.mockReturnValue(false);
    mockSelectIsEvmNetworkSelected.mockReturnValue(true);
    mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');
    mockSelectChainId.mockReturnValue('0x1');
  });

  const renderComponent = (props = {}, state = {}) => {
    const store = mockStore({ ...defaultState, ...state });
    return render(
      <Provider store={store}>
        <TokenListControlBar {...defaultProps} {...props} />
      </Provider>,
    );
  };

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('should navigate to NetworkManager when filter button is pressed', () => {
        // Ensure EVM is selected for the navigation to work
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);

        const { getByTestId } = renderComponent();

        const filterButton = getByTestId('token-network-filter');
        fireEvent.press(filterButton);

        expect(mockNavigate).toHaveBeenCalledWith('NetworkManager', {});
      });

      it('should show "All Networks text when multiple networks are enabled', () => {
        const { getByText } = renderComponent();

        expect(getByText('wallet.all_networks')).toBeTruthy();
      });

      it('should show current network name when only one network is enabled', () => {
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
        };
        mockUseCurrentNetworkInfo.mockReturnValue(singleNetworkInfo);

        const { getByText } = renderComponent();

        expect(getByText('Ethereum Mainnet')).toBeTruthy();
      });

      it('should show fallback text when no network info is available', () => {
        const noNetworkInfo = {
          enabledNetworks: [],
          getNetworkInfo: jest.fn(() => null),
          getNetworkInfoByChainId: jest.fn(() => null),
          isDisabled: false,
          hasEnabledNetworks: false,
        };
        mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);

        const { getByText } = renderComponent();

        expect(getByText('wallet.current_network')).toBeTruthy();
      });
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('should navigate to TokenFilter when filter button is pressed and EVM is selected', () => {
        // Ensure EVM is selected for the navigation to work
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);

        const { getByTestId } = renderComponent();

        const filterButton = getByTestId('token-network-filter');
        fireEvent.press(filterButton);

        expect(mockNavigate).toHaveBeenCalledWith('TokenFilter', {});
      });

      it('should show "Popular Networks" text when all conditions are met', () => {
        // Mock the selectors to return the expected values
        mockSelectIsAllNetworks.mockReturnValue(true);
        mockSelectIsPopularNetwork.mockReturnValue(true);
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);
        mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');

        const { getByText } = renderComponent();

        expect(getByText('wallet.popular_networks')).toBeTruthy();
      });

      it('should show network name when not all conditions are met', () => {
        // Ensure not all conditions are met
        mockSelectIsAllNetworks.mockReturnValue(false);
        mockSelectIsPopularNetwork.mockReturnValue(false);
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);
        mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');

        const { getByText } = renderComponent();

        expect(getByText('Ethereum Mainnet')).toBeTruthy();
      });

      it('should show fallback text when network name is not available', () => {
        // Ensure not all conditions are met and network name is null
        mockSelectIsAllNetworks.mockReturnValue(false);
        mockSelectIsPopularNetwork.mockReturnValue(false);
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);
        mockSelectNetworkName.mockReturnValue(null);

        const { getByText } = renderComponent();

        expect(getByText('wallet.current_network')).toBeTruthy();
      });
    });
  });

  describe('Button interactions', () => {
    it('should call goToAddToken when add token button is pressed', () => {
      const goToAddToken = jest.fn();
      const { getByTestId } = renderComponent({ goToAddToken });

      const addTokenButton = getByTestId('import-token-button');
      fireEvent.press(addTokenButton);

      expect(goToAddToken).toHaveBeenCalled();
    });

    it('should not call handleFilterControls when EVM is not selected', () => {
      // Ensure EVM is not selected
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);
      mockSelectChainId.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      const { getByTestId } = renderComponent();

      const filterButton = getByTestId('token-network-filter');
      fireEvent.press(filterButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Button states', () => {
    it('should disable filter button when isDisabled is true', () => {
      const disabledNetworkInfo = {
        ...defaultNetworkInfo,
        isDisabled: true,
      };
      mockUseCurrentNetworkInfo.mockReturnValue(disabledNetworkInfo);

      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('token-network-filter');

      expect(filterButton.props.disabled).toBe(true);
    });

    it('should disable add token button when EVM is not selected', () => {
      // Ensure EVM is not selected
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);
      mockSelectChainId.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      const { getByTestId } = renderComponent();
      const addTokenButton = getByTestId('import-token-button');

      expect(addTokenButton.props.disabled).toBe(true);
    });
  });
});
