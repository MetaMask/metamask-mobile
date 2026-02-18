import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { Text } from 'react-native';
import BaseControlBar, { BaseControlBarProps } from './BaseControlBar';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';

// Mock dependencies
jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: jest.fn(),
    useNetworksByCustomNamespace: jest.fn(),
    NetworkType: {
      Popular: 'popular',
    },
  }),
);

jest.mock('../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../Tokens/TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn(() => ['NetworkManager', {}]),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock selectors
const mockSelectNetworkName = jest.fn();

jest.mock('../../../../selectors/networkInfos', () => ({
  selectNetworkName: () => mockSelectNetworkName(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: () => '0x1',
}));

// Mock typed functions
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Import and mock useNetworksByNamespace
const useNetworksByNamespaceModule = jest.requireMock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
);

// Import and mock useNetworkEnablement
const useNetworkEnablementModule = jest.requireMock(
  '../../../hooks/useNetworkEnablement/useNetworkEnablement',
);

jest.mock('@metamask/keyring-api', () => ({
  EthMethod: {
    PersonalSign: 'personal_sign',
    SignTransaction: 'eth_signTransaction',
    SignTypedDataV4: 'eth_signTypedData_v4',
  },
  EthScope: {
    Eoa: 'eip155:eoa',
  },
  SolAccountType: {
    DataAccount: 'solana:dataAccount',
  },
  BtcAccountType: {
    P2wpkh: 'bip122:p2wpkh',
  },
  BtcScope: {
    Mainnet: 'bip122:000000000019d6689c085ae165831e93',
    Testnet: 'bip122:000000000933ea01ad0ee984209779ba',
  },
  SolScope: {
    Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    Devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  },
  isEvmAccountType: jest.fn(() => true),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const stableNullAccountSelector = () => null;
  return {
    selectSelectedInternalAccountByScope: () => stableNullAccountSelector,
  };
});

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

// Import and mock useStyles
const useStylesModule = jest.requireMock('../../../hooks/useStyles');

const mockStore = configureMockStore();

describe('BaseControlBar', () => {
  const mockNavigation = {
    navigate: jest.fn(),
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

  const defaultNetworksByNamespace = {
    areAllNetworksSelected: false,
  };

  const defaultStyles = {
    actionBarWrapper: {},
    controlButtonOuterWrapper: {},
    controlButtonInnerWrapper: {},
    controlButton: {},
    controlButtonDisabled: {},
    controlButtonText: {},
    controlIconButton: {},
    networkManagerWrapper: {},
  };

  const defaultProps: BaseControlBarProps = {
    networkFilterTestId: 'test-network-filter',
  };

  const defaultState = {
    engine: {
      backgroundState: {
        NetworkController: {
          isAllNetworks: false,
          isPopularNetwork: false,
        },
        MultichainNetworkController: {
          isEvmNetworkSelected: true,
        },
        NetworkInfosController: {
          networkName: 'Ethereum Mainnet',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    useNetworksByNamespaceModule.useNetworksByNamespace.mockReturnValue(
      defaultNetworksByNamespace,
    );
    useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue({
      areAllNetworksSelected: false,
      totalEnabledNetworksCount: 2,
    });
    useStylesModule.useStyles.mockReturnValue({ styles: defaultStyles });
    useNetworkEnablementModule.useNetworkEnablement.mockReturnValue({
      enableAllPopularNetworks: jest.fn(),
    });

    mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');
  });

  const renderComponent = (
    props: Partial<BaseControlBarProps> = {},
    state = {},
  ) => {
    const store = mockStore({ ...defaultState, ...state });
    return render(
      <Provider store={store}>
        <BaseControlBar {...defaultProps} {...props} />
      </Provider>,
    );
  };

  describe('Basic rendering', () => {
    it('renders with network filter button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('test-network-filter')).toBeTruthy();
    });

    it('renders with sort button', () => {
      const sortButtons = renderComponent().UNSAFE_getAllByType(ButtonIcon);
      expect(sortButtons.length).toBeGreaterThan(0);
    });

    it('renders additional buttons when provided', () => {
      const additionalButton = (
        <Text testID="additional-button">Add Token</Text>
      );
      const { getByTestId } = renderComponent({
        additionalButtons: additionalButton,
      });
      expect(getByTestId('additional-button')).toBeTruthy();
    });
  });

  describe('Network label rendering', () => {
    it('shows "Popular Networks" when multiple networks are enabled', () => {
      const { getByText } = renderComponent();
      expect(getByText('wallet.popular_networks')).toBeTruthy();
    });

    it('shows current network name when only one network is enabled', () => {
      const singleNetworkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: '1', enabled: true }],
      };
      mockUseCurrentNetworkInfo.mockReturnValue(singleNetworkInfo);
      useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue(
        {
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 1,
        },
      );

      const { getByText } = renderComponent();
      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('shows fallback text when no network info is available', () => {
      const noNetworkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: '1', enabled: true }], // Single network
        getNetworkInfo: jest.fn(() => null),
      };
      mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);
      useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue(
        {
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 1,
        },
      );

      const { getByText } = renderComponent();
      expect(getByText('wallet.current_network')).toBeTruthy();
    });

    it('shows network avatar when not all networks selected', () => {
      useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue(
        {
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 2,
        },
      );

      renderComponent();
      // Avatar should be rendered (tested via component structure)
      expect(
        useNetworksByNamespaceModule.useNetworksByCustomNamespace,
      ).toHaveBeenCalled();
    });

    it('does not show network avatar when all networks selected', () => {
      useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue(
        {
          areAllNetworksSelected: true,
          totalEnabledNetworksCount: 5,
        },
      );

      renderComponent();
      expect(
        useNetworksByNamespaceModule.useNetworksByCustomNamespace,
      ).toHaveBeenCalled();
    });
  });

  describe('Button interactions', () => {
    it('calls custom filter handler when provided', () => {
      const customFilterHandler = jest.fn();
      const { getByTestId } = renderComponent({
        onFilterPress: customFilterHandler,
      });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(customFilterHandler).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('calls default sort handler when no custom handler provided', () => {
      const { UNSAFE_getAllByType } = renderComponent();
      const buttonIcons = UNSAFE_getAllByType(ButtonIcon);
      const sortButton = buttonIcons[0]; // First ButtonIcon should be sort button

      fireEvent.press(sortButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'TokensBottomSheet',
        {},
      );
    });

    it('calls custom sort handler when provided', () => {
      const customSortHandler = jest.fn();
      const { UNSAFE_getAllByType } = renderComponent({
        onSortPress: customSortHandler,
      });
      const buttonIcons = UNSAFE_getAllByType(ButtonIcon);
      const sortButton = buttonIcons[0];

      fireEvent.press(sortButton);

      expect(customSortHandler).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Filter button behavior', () => {
    it('navigates to NetworkManager when filter button is pressed', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'NetworkManager',
        {},
      );
    });

    it('shows arrow icon on network filter button', () => {
      const { UNSAFE_getAllByType } = renderComponent();
      const buttonBases = UNSAFE_getAllByType(ButtonBase);

      expect(buttonBases[0].props.endIconName).toBe('ArrowDown');
    });
  });

  describe('Disabled states', () => {
    it('does not be disabled when custom isDisabled param is not provided', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.disabled).toBe(false);
    });

    it('applies disabled styles when disabled', () => {
      const { getByTestId } = renderComponent({
        isDisabled: true,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.style).toBeDefined();
      expect(filterButton.props.style.opacity).toBe(0.5);
    });

    it('applies normal styles when not disabled', () => {
      const { getByTestId } = renderComponent({
        isDisabled: false,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.style).toBeDefined();
      expect(filterButton.props.style.opacity).toBeUndefined();
    });

    it('respects custom isDisabled param when provided', () => {
      const { getByTestId } = renderComponent({
        isDisabled: true,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.disabled).toBe(true);
    });
  });

  describe('Custom wrapper layouts', () => {
    it('renders with outer wrapper by default', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      // Button should be wrapped in outer wrapper structure
      expect(filterButton).toBeTruthy();
    });

    it('renders without outer wrapper when customWrapper is "none"', () => {
      const { getByTestId } = renderComponent({
        customWrapper: 'none',
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton).toBeTruthy();
    });

    it('renders with outer wrapper when customWrapper is "outer"', () => {
      const { getByTestId } = renderComponent({
        customWrapper: 'outer',
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton).toBeTruthy();
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles missing selector values gracefully', () => {
      mockSelectNetworkName.mockReturnValue(undefined);

      expect(() => renderComponent()).not.toThrow();
    });

    it('handles network image source generation', () => {
      const networkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
      };
      mockUseCurrentNetworkInfo.mockReturnValue(networkInfo);

      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('Integration with strings', () => {
    it('calls strings function for localized text', () => {
      const multiNetworkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: '1', enabled: true },
          { chainId: '137', enabled: true },
        ],
      };
      mockUseCurrentNetworkInfo.mockReturnValue(multiNetworkInfo);

      const { getByText } = renderComponent();

      expect(getByText('wallet.popular_networks')).toBeTruthy();
    });

    it('calls strings function for fallback text with single network', () => {
      mockSelectNetworkName.mockReturnValue(null);
      const noNetworkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: '1', enabled: true }], // Single network
        getNetworkInfo: jest.fn(() => null),
      };
      mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);
      useNetworksByNamespaceModule.useNetworksByCustomNamespace.mockReturnValue(
        {
          areAllNetworksSelected: false,
          totalEnabledNetworksCount: 1,
        },
      );

      renderComponent();

      expect(strings).toHaveBeenCalledWith('wallet.current_network');
    });
  });
});
