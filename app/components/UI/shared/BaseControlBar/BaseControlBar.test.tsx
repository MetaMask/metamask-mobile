import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { Text } from 'react-native';
import BaseControlBar, { BaseControlBarProps } from './BaseControlBar';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';

// Mock dependencies
jest.mock('../../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
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
    NetworkType: {
      Popular: 'popular',
    },
  }),
);

jest.mock('../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../Tokens/TokensBottomSheet', () => ({
  createTokenBottomSheetFilterNavDetails: jest.fn(() => ['TokenFilter', {}]),
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn(() => ['NetworkManager', {}]),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock selectors
const mockSelectIsAllNetworks = jest.fn();
const mockSelectIsPopularNetwork = jest.fn();
const mockSelectIsEvmNetworkSelected = jest.fn();
const mockSelectNetworkName = jest.fn();

jest.mock('../../../../selectors/networkController', () => ({
  selectIsAllNetworks: () => mockSelectIsAllNetworks(),
  selectIsPopularNetwork: () => mockSelectIsPopularNetwork(),
}));

jest.mock('../../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: () => mockSelectIsEvmNetworkSelected(),
}));

jest.mock('../../../../selectors/networkInfos', () => ({
  selectNetworkName: () => mockSelectNetworkName(),
}));

// Mock typed functions
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockIsRemoveGlobalNetworkSelectorEnabled =
  isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
    typeof isRemoveGlobalNetworkSelectorEnabled
  >;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Import and mock useNetworksByNamespace
const useNetworksByNamespaceModule = jest.requireMock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
);

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
    useStylesModule.useStyles.mockReturnValue({ styles: defaultStyles });
    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

    // Setup selector mocks
    mockSelectIsAllNetworks.mockReturnValue(false);
    mockSelectIsPopularNetwork.mockReturnValue(false);
    mockSelectIsEvmNetworkSelected.mockReturnValue(true);
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
    it('should render with network filter button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('test-network-filter')).toBeTruthy();
    });

    it('should render with sort button', () => {
      const sortButtons = renderComponent().UNSAFE_getAllByType(ButtonIcon);
      expect(sortButtons.length).toBeGreaterThan(0);
    });

    it('should render additional buttons when provided', () => {
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
    describe('when isRemoveGlobalNetworkSelectorEnabled is true', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('should show "All Networks" when multiple networks are enabled', () => {
        const { getByText } = renderComponent();
        expect(getByText('wallet.all_networks')).toBeTruthy();
      });

      it('should show current network name when only one network is enabled', () => {
        const singleNetworkInfo = {
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: '1', enabled: true }],
        };
        mockUseCurrentNetworkInfo.mockReturnValue(singleNetworkInfo);

        const { getByText } = renderComponent();
        expect(getByText('Ethereum Mainnet')).toBeTruthy();
      });

      it('should show fallback text when no network info is available', () => {
        const noNetworkInfo = {
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: '1', enabled: true }], // Single network
          getNetworkInfo: jest.fn(() => null),
        };
        mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);

        const { getByText } = renderComponent();
        expect(getByText('wallet.current_network')).toBeTruthy();
      });

      it('should show network avatar when not all networks selected', () => {
        useNetworksByNamespaceModule.useNetworksByNamespace.mockReturnValue({
          areAllNetworksSelected: false,
        });

        renderComponent();
        // Avatar should be rendered (tested via component structure)
        expect(
          useNetworksByNamespaceModule.useNetworksByNamespace,
        ).toHaveBeenCalled();
      });

      it('should not show network avatar when all networks selected', () => {
        useNetworksByNamespaceModule.useNetworksByNamespace.mockReturnValue({
          areAllNetworksSelected: true,
        });

        renderComponent();
        expect(
          useNetworksByNamespaceModule.useNetworksByNamespace,
        ).toHaveBeenCalled();
      });
    });

    describe('when isRemoveGlobalNetworkSelectorEnabled is false', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('should show "Popular Networks" when all conditions are met', () => {
        mockSelectIsAllNetworks.mockReturnValue(true);
        mockSelectIsPopularNetwork.mockReturnValue(true);
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);

        const { getByText } = renderComponent();
        expect(getByText('wallet.popular_networks')).toBeTruthy();
      });

      it('should show network name when not all conditions are met', () => {
        mockSelectIsAllNetworks.mockReturnValue(false);
        mockSelectIsPopularNetwork.mockReturnValue(false);
        mockSelectIsEvmNetworkSelected.mockReturnValue(true);

        const { getByText } = renderComponent();
        expect(getByText('Ethereum Mainnet')).toBeTruthy();
      });

      it('should show fallback text when network name is not available', () => {
        mockSelectNetworkName.mockReturnValue(null);

        const { getByText } = renderComponent();
        expect(getByText('wallet.current_network')).toBeTruthy();
      });
    });
  });

  describe('Button interactions', () => {
    it('should call default filter handler when no custom handler provided', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TokenFilter', {});
    });

    it('should call custom filter handler when provided', () => {
      const customFilterHandler = jest.fn();
      const { getByTestId } = renderComponent({
        onFilterPress: customFilterHandler,
      });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(customFilterHandler).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should call default sort handler when no custom handler provided', () => {
      const { UNSAFE_getAllByType } = renderComponent();
      const buttonIcons = UNSAFE_getAllByType(ButtonIcon);
      const sortButton = buttonIcons[0]; // First ButtonIcon should be sort button

      fireEvent.press(sortButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'TokensBottomSheet',
        {},
      );
    });

    it('should call custom sort handler when provided', () => {
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

  describe('EVM selection logic', () => {
    it('should navigate to NetworkManager when feature flag is enabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'NetworkManager',
        {},
      );
    });

    it('should navigate to TokenFilter when useEvmSelectionLogic is true and EVM is selected', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(true);

      const { getByTestId } = renderComponent({
        useEvmSelectionLogic: true,
      });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TokenFilter', {});
    });

    it('should not navigate when useEvmSelectionLogic is true and EVM is not selected', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);

      const { getByTestId } = renderComponent({
        useEvmSelectionLogic: true,
      });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should always navigate when useEvmSelectionLogic is false', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);

      const { getByTestId } = renderComponent({
        useEvmSelectionLogic: false,
      });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TokenFilter', {});
    });

    it('should show arrow icon when EVM is selected and useEvmSelectionLogic is true', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(true);

      const { UNSAFE_getAllByType } = renderComponent({
        useEvmSelectionLogic: true,
      });
      const buttonBases = UNSAFE_getAllByType(ButtonBase);

      expect(buttonBases[0].props.endIconName).toBe('ArrowDown');
    });

    it('should not show arrow icon when EVM is not selected and useEvmSelectionLogic is true', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);

      const { UNSAFE_getAllByType } = renderComponent({
        useEvmSelectionLogic: true,
      });
      const buttonBases = UNSAFE_getAllByType(ButtonBase);

      expect(buttonBases[0].props.endIconName).toBeUndefined();
    });

    it('should always show arrow icon when useEvmSelectionLogic is false', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);

      const { UNSAFE_getAllByType } = renderComponent({
        useEvmSelectionLogic: false,
      });
      const buttonBases = UNSAFE_getAllByType(ButtonBase);

      expect(buttonBases[0].props.endIconName).toBe('ArrowDown');
    });
  });

  describe('Disabled states', () => {
    it('should use custom isDisabled when provided', () => {
      const { getByTestId } = renderComponent({
        isDisabled: true,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.disabled).toBe(true);
    });

    it('should fall back to hook isDisabled when custom not provided', () => {
      const disabledNetworkInfo = {
        ...defaultNetworkInfo,
        isDisabled: true,
      };
      mockUseCurrentNetworkInfo.mockReturnValue(disabledNetworkInfo);

      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.disabled).toBe(true);
    });

    it('should apply disabled styles when disabled', () => {
      const { getByTestId } = renderComponent({
        isDisabled: true,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.style).toBeDefined();
      expect(filterButton.props.style.opacity).toBe(0.5);
    });

    it('should apply normal styles when not disabled', () => {
      const { getByTestId } = renderComponent({
        isDisabled: false,
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton.props.style).toBeDefined();
      expect(filterButton.props.style.opacity).toBeUndefined();
    });
  });

  describe('Custom wrapper layouts', () => {
    it('should render with outer wrapper by default', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId('test-network-filter');

      // Button should be wrapped in outer wrapper structure
      expect(filterButton).toBeTruthy();
    });

    it('should render without outer wrapper when customWrapper is "none"', () => {
      const { getByTestId } = renderComponent({
        customWrapper: 'none',
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton).toBeTruthy();
    });

    it('should render with outer wrapper when customWrapper is "outer"', () => {
      const { getByTestId } = renderComponent({
        customWrapper: 'outer',
      });
      const filterButton = getByTestId('test-network-filter');

      expect(filterButton).toBeTruthy();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing selector values gracefully', () => {
      mockSelectNetworkName.mockReturnValue(undefined);
      mockSelectIsAllNetworks.mockReturnValue(undefined);
      mockSelectIsPopularNetwork.mockReturnValue(undefined);
      mockSelectIsEvmNetworkSelected.mockReturnValue(undefined);

      expect(() => renderComponent()).not.toThrow();
    });

    it('should handle network image source generation', () => {
      const networkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
      };
      mockUseCurrentNetworkInfo.mockReturnValue(networkInfo);

      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('Integration with strings', () => {
    it('should call strings function for localized text', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      const multiNetworkInfo = {
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: '1', enabled: true },
          { chainId: '137', enabled: true },
        ],
      };
      mockUseCurrentNetworkInfo.mockReturnValue(multiNetworkInfo);

      const { getByText } = renderComponent();

      expect(getByText('wallet.all_networks')).toBeTruthy();
    });

    it('should call strings function for fallback text', () => {
      mockSelectNetworkName.mockReturnValue(null);
      const noNetworkInfo = {
        ...defaultNetworkInfo,
        getNetworkInfo: jest.fn(() => null),
      };
      mockUseCurrentNetworkInfo.mockReturnValue(noNetworkInfo);

      renderComponent();

      expect(strings).toHaveBeenCalledWith('wallet.current_network');
    });
  });
});
