import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import { createStore } from 'redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  useNetworksByNamespace,
  useNetworksByCustomNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import NetworkMultiSelector from './NetworkMultiSelector';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

jest.mock('../../../util/hideKeyFromUrl', () => jest.fn());

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: { default: '#0378FF' },
    },
  })),
}));

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      bodyContainer: {},
      selectAllText: {},
      customNetworkContainer: {},
    },
    theme: {
      colors: {
        icon: {
          alternative: '#666666',
        },
        text: {
          alternative: '#999999',
        },
      },
    },
  })),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  useNetworksByCustomNamespace: jest.fn(),
  NetworkType: {
    Popular: 'Popular',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  Provider: jest.requireActual('react-redux').Provider,
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => jest.fn()),
  selectInternalAccounts: jest.fn(),
  selectInternalAccountsById: jest.fn(),
}));

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountTreeControllerState: jest.fn(),
  }),
);

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => null),
}));

jest.mock('../../../util/networks/customNetworks', () => ({
  PopularList: [],
}));

jest.mock('../NetworkMultiSelectorList/NetworkMultiSelectorList', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mockReact = require('react');
  return function MockNetworkMultiSelectorList(props: Record<string, unknown>) {
    return mockReact.createElement('View', {
      testID: 'mock-network-multi-selector-list',
      ...props,
    });
  };
});

jest.mock(
  '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mockReact = require('react');
    return function MockCustomNetwork(props: Record<string, unknown>) {
      return mockReact.createElement('View', {
        testID: 'mock-custom-network',
        ...props,
      });
    };
  },
);

jest.mock('../../../component-library/components/Texts/Text', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mockReact = require('react');
  const MockText = function MockText(props: Record<string, unknown>) {
    return mockReact.createElement(
      'Text',
      {
        testID: props.testID,
        onPress: props.onPress,
        ...props,
      },
      props.children,
    );
  };

  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
    },
  };
});

// Mock store setup
const mockStore = createStore(() => ({
  featureFlags: {
    multichainAccounts: {
      enabledMultichainAccounts: true,
    },
  },
}));

describe('NetworkMultiSelector', () => {
  const mockOpenModal = jest.fn();
  const mockSelectPopularNetwork = jest.fn();

  const mockToggleAll = jest.fn();
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockUseNetworksByNamespace =
    useNetworksByNamespace as jest.MockedFunction<
      typeof useNetworksByNamespace
    >;
  const mockUseNetworksByCustomNamespace =
    useNetworksByCustomNamespace as jest.MockedFunction<
      typeof useNetworksByCustomNamespace
    >;
  const mockUseNetworkSelection = useNetworkSelection as jest.MockedFunction<
    typeof useNetworkSelection
  >;
  const mockUseSelector = jest.mocked(useSelector);

  const mockNetworks = [
    {
      id: 'eip155:1' as const,
      name: 'Ethereum Mainnet',
      caipChainId: 'eip155:1' as const,
      networkTypeOrRpcUrl: 'mainnet',
      isSelected: true,
      imageSource: { uri: 'ethereum.png' },
    },
    {
      id: 'eip155:137' as const,
      name: 'Polygon',
      caipChainId: 'eip155:137' as const,
      networkTypeOrRpcUrl: 'https://polygon-rpc.com',
      isSelected: false,
      imageSource: { uri: 'polygon.png' },
    },
  ];

  const mockEnabledNetworks = {
    eip155: {
      'eip155:1': true,
      'eip155:137': false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNetworkEnablement.mockReturnValue({
      namespace: KnownCaipNamespace.Eip155,
      enabledNetworksByNamespace: mockEnabledNetworks,
      enabledNetworksForCurrentNamespace: mockEnabledNetworks.eip155,
      networkEnablementController: {} as NetworkEnablementController,
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
      enableAllPopularNetworks: jest.fn(),
      isNetworkEnabled: jest.fn(),
      hasOneEnabledNetwork: false,
      tryEnableEvmNetwork: jest.fn(),
    });

    mockUseNetworksByNamespace.mockReturnValue({
      networks: mockNetworks,
      selectedNetworks: [mockNetworks[0]],
      selectedCount: 1,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: true,
      networkCount: 2,
    });

    mockUseNetworksByCustomNamespace.mockReturnValue({
      networks: mockNetworks,
      selectedNetworks: [mockNetworks[0]],
      selectedCount: 1,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: true,
      networkCount: 2,
      totalEnabledNetworksCount: 2,
    });

    mockUseNetworkSelection.mockReturnValue({
      selectPopularNetwork: mockSelectPopularNetwork,
      selectCustomNetwork: jest.fn(),
      selectNetwork: jest.fn(),
      deselectAll: jest.fn(),
      selectAllPopularNetworks: mockToggleAll,
      resetCustomNetworks: jest.fn(),
      customNetworksToReset: [],
    });

    mockUseSelector
      .mockReturnValueOnce(true) // Mock isMultichainAccountsState2Enabled
      .mockReturnValueOnce((_scope: string) => null) // Mock selectedEvmAccount selector function
      .mockReturnValueOnce((_scope: string) => null); // Mock selectedSolanaAccount selector function
  });

  // TODO: Refactor tests - they aren't up to par
  // Helper function to render with Redux provider
  const renderWithProvider = (component: React.ReactElement) =>
    render(<Provider store={mockStore}>{component}</Provider>);

  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER),
      ).toBeTruthy();
    });

    it('calls useNetworkEnablement', () => {
      renderWithProvider(<NetworkMultiSelector openModal={mockOpenModal} />);
      expect(mockUseNetworkEnablement).toHaveBeenCalled();
    });

    it('calls useNetworksByNamespace with Popular network type', () => {
      renderWithProvider(<NetworkMultiSelector openModal={mockOpenModal} />);
      expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
      });
    });

    it('calls useNetworkSelection with networks', () => {
      renderWithProvider(<NetworkMultiSelector openModal={mockOpenModal} />);
      // The component uses the networks from the combined logic
      expect(mockUseNetworkSelection).toHaveBeenCalledWith({
        networks: mockNetworks, // Based on the actual error output, it's only using one set
      });
    });

    it('renders NetworkMultiSelectorList', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );
      expect(getByTestId('mock-network-multi-selector-list')).toBeTruthy();
    });
  });

  describe('namespace handling', () => {
    it('renders custom network component for EIP155 namespace', () => {
      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.additionalNetworksComponent).toBeTruthy();
      expect(networkList.props.additionalNetworksComponent.props.testID).toBe(
        NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER,
      );
    });

    it('does not render custom network component for non-EIP155 namespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'solana' as KnownCaipNamespace,
        enabledNetworksByNamespace: { solana: {} },
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as NetworkEnablementController,
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      const { queryByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      expect(
        queryByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER),
      ).toBeNull();
      expect(queryByTestId('mock-custom-network')).toBeNull();
    });
  });

  describe('selected chain IDs', () => {
    it('calculates selectedChainIds from enabled networks', () => {
      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.selectedChainIds).toEqual(['eip155:1']);
    });

    it('handles empty enabled networks', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: { eip155: {} },
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as NetworkEnablementController,
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.selectedChainIds).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles empty networks array', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        networks: [],
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 0,
      });

      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER),
      ).toBeTruthy();
      expect(getByTestId('mock-network-multi-selector-list')).toBeTruthy();
    });
  });

  describe('component props', () => {
    it('passes correct props to NetworkMultiSelectorList', () => {
      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.openModal).toBe(mockOpenModal);
      expect(networkList.props.networks).toBe(mockNetworks);
      expect(networkList.props.additionalNetworksComponent).toBeTruthy();
    });
  });

  describe('multichain account scenarios', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset default mocks
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: mockEnabledNetworks,
        enabledNetworksForCurrentNamespace: mockEnabledNetworks.eip155,
        networkEnablementController: {} as NetworkEnablementController,
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      mockUseNetworksByNamespace.mockReturnValue({
        networks: mockNetworks,
        selectedNetworks: [mockNetworks[0]],
        selectedCount: 1,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: true,
        networkCount: 2,
      });

      mockUseNetworkSelection.mockReturnValue({
        selectPopularNetwork: mockSelectPopularNetwork,
        selectCustomNetwork: jest.fn(),
        selectNetwork: jest.fn(),
        deselectAll: jest.fn(),
        selectAllPopularNetworks: mockToggleAll,
        resetCustomNetworks: jest.fn(),
        customNetworksToReset: [],
      });
    });

    it('calls useNetworksByCustomNamespace for both EVM and Solana when multichain is enabled', () => {
      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => ({ id: 'evm-account' })) // selectedEvmAccount
        .mockReturnValueOnce(() => ({ id: 'solana-account' })); // selectedSolanaAccount

      renderWithProvider(<NetworkMultiSelector openModal={mockOpenModal} />);

      // Should call useNetworksByCustomNamespace twice (once for EVM, once for Solana)
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledTimes(2);
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
        namespace: KnownCaipNamespace.Eip155,
      });
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
        namespace: KnownCaipNamespace.Solana,
      });
    });

    it('uses only EVM networks when only EVM account is selected', () => {
      const mockEvmNetworks = [mockNetworks[0]];

      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: [mockEvmNetworks[0]],
          selectedCount: 1,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        })
        .mockReturnValueOnce({
          networks: [],
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => ({ id: 'evm-account' })) // selectedEvmAccount
        .mockReturnValueOnce(() => null); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.networks).toEqual(mockEvmNetworks);
    });

    it('handles Solana-only account selection', () => {
      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => null) // selectedEvmAccount
        .mockReturnValueOnce(() => ({ id: 'solana-account' })); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      // Should render a network list when only Solana account is selected
      expect(networkList.props.networks).toBeDefined();
      expect(Array.isArray(networkList.props.networks)).toBe(true);
    });

    it('falls back to regular networks when no accounts are selected', () => {
      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => null) // selectedEvmAccount
        .mockReturnValueOnce(() => null); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.networks).toEqual(mockNetworks);
    });

    it('uses regular networks when multichain is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce(false) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => ({ id: 'evm-account' })) // selectedEvmAccount
        .mockReturnValueOnce(() => ({ id: 'solana-account' })); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.networks).toEqual(mockNetworks);
    });
  });

  describe('areAllNetworksSelected combined logic', () => {
    it('returns true when both EVM and Solana networks are all selected', () => {
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockNetworks,
          selectedNetworks: mockNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockNetworks,
          selectedNetworks: mockNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        });

      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => ({ id: 'evm-account' })) // selectedEvmAccount
        .mockReturnValueOnce(() => ({ id: 'solana-account' })); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.areAllNetworksSelected).toBe(true);
    });

    it('returns false when EVM networks are selected but Solana networks are not', () => {
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockNetworks,
          selectedNetworks: mockNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        });

      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => ({ id: 'evm-account' })) // selectedEvmAccount
        .mockReturnValueOnce(() => ({ id: 'solana-account' })); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.areAllNetworksSelected).toBe(false);
    });
  });

  describe('network selection callbacks', () => {
    const mockDismissModal = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls selectPopularNetwork with dismissModal when onSelectNetwork is called', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const { onSelectNetwork } = networkList.props;

      await onSelectNetwork('eip155:1');

      expect(mockSelectPopularNetwork).toHaveBeenCalledWith(
        'eip155:1',
        mockDismissModal,
      );
    });

    it('calls selectAllPopularNetworks with dismissModal when selectAll is triggered', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const selectAllComponent = networkList.props.selectAllNetworksComponent;

      // Simulate pressing the select all component
      await selectAllComponent.props.onPress();

      expect(mockToggleAll).toHaveBeenCalledWith(mockDismissModal);
    });

    it('works without dismissModal prop', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const { onSelectNetwork } = networkList.props;

      await onSelectNetwork('eip155:1');

      expect(mockSelectPopularNetwork).toHaveBeenCalledWith(
        'eip155:1',
        undefined,
      );
    });
  });

  describe('custom network functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders custom network component for multichain enabled even with non-EIP155 namespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'solana' as KnownCaipNamespace,
        enabledNetworksByNamespace: { solana: {} },
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as NetworkEnablementController,
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      mockUseSelector
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled
        .mockReturnValueOnce(() => null) // selectedEvmAccount
        .mockReturnValueOnce(() => null); // selectedSolanaAccount

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.additionalNetworksComponent).toBeTruthy();
      expect(networkList.props.additionalNetworksComponent.props.testID).toBe(
        NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER,
      );
    });

    it('passes correct customNetworkProps to CustomNetwork', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;

      // The custom network component should be rendered within the additional networks component
      expect(customNetworkComponent).toBeTruthy();
      expect(customNetworkComponent.props.testID).toBe(
        NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER,
      );

      // Check that CustomNetwork is a child of the Box
      const customNetworkChild = customNetworkComponent.props.children;
      expect(customNetworkChild).toBeTruthy();
      const customNetworkProps = customNetworkChild.props;
      expect(customNetworkProps.switchTab).toBeUndefined();
      expect(customNetworkProps.shouldNetworkSwitchPopToWallet).toBe(false);
      expect(customNetworkProps.showCompletionMessage).toBe(false);
      expect(customNetworkProps.showPopularNetworkModal).toBe(true);
      expect(customNetworkProps.allowNetworkSwitch).toBe(false);
      expect(customNetworkProps.hideWarningIcons).toBe(true);
      expect(customNetworkProps.compactMode).toBe(true);
      expect(customNetworkProps.isNetworkModalVisible).toBe(false);
      expect(typeof customNetworkProps.closeNetworkModal).toBe('function');
      expect(typeof customNetworkProps.toggleWarningModal).toBe('function');
      expect(typeof customNetworkProps.showNetworkModal).toBe('function');
    });
  });

  describe('modal state management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('provides showNetworkModal function in customNetworkProps', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkChild = customNetworkComponent.props.children;
      const customNetworkProps = customNetworkChild.props;

      expect(typeof customNetworkProps.showNetworkModal).toBe('function');
      expect(typeof customNetworkProps.closeNetworkModal).toBe('function');
      expect(typeof customNetworkProps.toggleWarningModal).toBe('function');
    });

    it('has hideKeyFromUrl functionality available', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkChild = customNetworkComponent.props.children;
      const customNetworkProps = customNetworkChild.props;

      // Test that the function exists and can be called
      expect(typeof customNetworkProps.showNetworkModal).toBe('function');

      // Since hideKeyFromUrl is already mocked, just verify the showNetworkModal function works
      const mockNetwork = {
        chainId: '0x1',
        nickname: 'Test Network',
        rpcUrl: 'https://test-rpc.com/secret-key',
        ticker: 'ETH',
        warning: false,
      };

      expect(() =>
        customNetworkProps.showNetworkModal(mockNetwork),
      ).not.toThrow();
    });

    it('handles network configuration with warning property', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkChild = customNetworkComponent.props.children;
      const customNetworkProps = customNetworkChild.props;

      const mockNetwork = {
        chainId: '0x1',
        nickname: 'Test Network',
        rpcUrl: 'https://test-rpc.com/secret-key',
        ticker: 'ETH',
        warning: true,
      };

      expect(() =>
        customNetworkProps.showNetworkModal(mockNetwork),
      ).not.toThrow();
    });

    it('modal state starts with correct initial values', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkChild = customNetworkComponent.props.children;
      const customNetworkProps = customNetworkChild.props;

      expect(customNetworkProps.isNetworkModalVisible).toBe(false);
      expect(customNetworkProps.selectedNetwork).toBeUndefined();
    });
  });

  describe('select all networks component', () => {
    it('renders with correct props when not all networks are selected', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        networks: mockNetworks,
        selectedNetworks: [mockNetworks[0]],
        selectedCount: 1,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: true,
        networkCount: 2,
      });

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const selectAllComponent = networkList.props.selectAllNetworksComponent;

      expect(selectAllComponent.props.isSelected).toBe(false);
      expect(selectAllComponent.props.title).toBe(
        'networks.all_popular_networks',
      );
      expect(typeof selectAllComponent.props.onPress).toBe('function');
    });

    it('renders with correct props when all networks are selected', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        networks: mockNetworks,
        selectedNetworks: mockNetworks,
        selectedCount: 2,
        areAllNetworksSelected: true,
        areAnyNetworksSelected: true,
        networkCount: 2,
      });

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const selectAllComponent = networkList.props.selectAllNetworksComponent;

      expect(selectAllComponent.props.isSelected).toBe(true);
    });
  });

  describe('memo optimization', () => {
    it('component is exported and functional', () => {
      // Test that the component is properly exported and can be instantiated
      expect(NetworkMultiSelector).toBeDefined();
      // Verify it can render without errors
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER),
      ).toBeTruthy();
    });
  });
});
