import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import { createStore } from 'redux';
import { CaipChainId } from '@metamask/utils';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import NetworkMultiSelector from './NetworkMultiSelector';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

jest.mock('../../../util/hideKeyFromUrl', () => jest.fn());

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => {
    const { mockTheme } = jest.requireActual('../../../util/theme');
    return {
      styles: {
        bodyContainer: {},
        selectAllText: {},
        customNetworkContainer: {},
        selectAllPopularNetworksCell: {},
      },
      theme: mockTheme,
    };
  }),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  NetworkType: {
    Popular: 'Popular',
  },
}));

jest.mock('../../hooks/useNetworksToUse/useNetworksToUse', () => ({
  useNetworksToUse: jest.fn(),
}));

jest.mock('../../hooks/useAddPopularNetwork', () => ({
  useAddPopularNetwork: jest.fn(),
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  Provider: jest.requireActual('react-redux').Provider,
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

const mockStore = createStore(() => ({}));

describe('NetworkMultiSelector', () => {
  const mockOpenModal = jest.fn();
  const mockAddPopularNetwork = jest.fn();
  const mockEnableAllPopularNetworks = jest.fn();
  const mockOnLocalNetworkSelect = jest.fn();
  const mockDismissModal = jest.fn();

  const mockUseNetworksByNamespace =
    useNetworksByNamespace as jest.MockedFunction<
      typeof useNetworksByNamespace
    >;
  const mockUseNetworksToUse = useNetworksToUse as jest.MockedFunction<
    typeof useNetworksToUse
  >;
  const mockUseAddPopularNetwork = useAddPopularNetwork as jest.MockedFunction<
    typeof useAddPopularNetwork
  >;
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockUseSelector = jest.mocked(useSelector);
  const mockTrackEvent = jest.fn();
  let capturedProperties: Record<string, unknown> = {};

  const createMockNetwork = (
    name: string,
    caipChainId: CaipChainId,
    isSelected: boolean,
  ) => ({
    id: caipChainId,
    name,
    caipChainId,
    isSelected,
    imageSource: { uri: `${name.toLowerCase()}.png` },
    networkTypeOrRpcUrl: undefined,
    hasMultipleRpcs: false,
  });

  const mockEthereum = createMockNetwork('Ethereum Mainnet', 'eip155:1', true);
  const mockPolygon = createMockNetwork('Polygon', 'eip155:137', false);
  const mockNetworks = [mockEthereum, mockPolygon];

  const renderWithProvider = (
    component: React.ReactElement,
  ): ReturnType<typeof render> =>
    render(<Provider store={mockStore}>{component}</Provider>);

  const defaultRenderProps = {
    openModal: mockOpenModal,
    dismissModal: mockDismissModal,
    onLocalNetworkSelect: mockOnLocalNetworkSelect,
    localSelectedChainIds: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNetworksByNamespace.mockReturnValue({
      networks: mockNetworks,
      selectedNetworks: [mockEthereum],
      selectedCount: 1,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: true,
      networkCount: 2,
    });

    mockUseNetworksToUse.mockReturnValue({
      networksToUse: mockNetworks,
      evmNetworks: mockNetworks,
      solanaNetworks: [],
      bitcoinNetworks: [],
      tronNetworks: [],
      stellarNetworks: [],
      selectedEvmAccount: null,
      selectedSolanaAccount: null,
      selectedBitcoinAccount: null,
      selectedTronAccount: null,
      selectedStellarAccount: null,
      areAllNetworksSelectedCombined: false,
      areAllEvmNetworksSelected: false,
      areAllSolanaNetworksSelected: false,
      areAllBitcoinNetworksSelected: false,
      areAllTronNetworksSelected: false,
      areAllStellarNetworksSelected: false,
    });

    mockUseAddPopularNetwork.mockReturnValue({
      addPopularNetwork: mockAddPopularNetwork,
    });

    mockUseNetworkEnablement.mockReturnValue({
      enableAllPopularNetworks: mockEnableAllPopularNetworks,
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    mockUseSelector.mockReturnValue([]);

    capturedProperties = {};
    const mockAddProperties = jest.fn((props: Record<string, unknown>) => {
      capturedProperties = { ...capturedProperties, ...props };
      return {
        addProperties: mockAddProperties,
        build: () => ({
          event: MetaMetricsEvents.NETWORK_SWITCHED,
          properties: capturedProperties,
        }),
      };
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: jest.fn(() => ({
          addProperties: mockAddProperties,
          addSensitiveProperties: jest.fn().mockReturnThis(),
          removeProperties: jest.fn().mockReturnThis(),
          removeSensitiveProperties: jest.fn().mockReturnThis(),
          build: () => ({
            name: 'Network Switched',
            properties: capturedProperties,
            sensitiveProperties: {},
          }),
        })),
      }),
    );
  });

  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('calls useNetworksByNamespace with Popular network type', () => {
      renderWithProvider(<NetworkMultiSelector {...defaultRenderProps} />);
      expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
      });
    });

    it('renders NetworkMultiSelectorList', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );
      expect(getByTestId('mock-network-multi-selector-list')).toBeTruthy();
    });

    it('handles empty networks array', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        networks: [],
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 0,
      });
      mockUseNetworksToUse.mockReturnValue({
        networksToUse: [],
        evmNetworks: [],
        solanaNetworks: [],
        bitcoinNetworks: [],
        tronNetworks: [],
        stellarNetworks: [],
        selectedEvmAccount: null,
        selectedSolanaAccount: null,
        selectedBitcoinAccount: null,
        selectedTronAccount: null,
        selectedStellarAccount: null,
        areAllNetworksSelectedCombined: false,
        areAllEvmNetworksSelected: false,
        areAllSolanaNetworksSelected: false,
        areAllBitcoinNetworksSelected: false,
        areAllTronNetworksSelected: false,
        areAllStellarNetworksSelected: false,
      });

      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER),
      ).toBeTruthy();
      expect(getByTestId('mock-network-multi-selector-list')).toBeTruthy();
    });
  });

  describe('local (Redux-free) selection', () => {
    it('marks networks as selected based on localSelectedChainIds', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          localSelectedChainIds={['eip155:137']}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.networks).toEqual([
        { ...mockEthereum, isSelected: false },
        { ...mockPolygon, isSelected: true },
      ]);
    });

    it('marks no network as individually selected when localSelectedChainIds is null', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          localSelectedChainIds={null}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(
        networkList.props.networks.every(
          (network: { isSelected: boolean }) => !network.isSelected,
        ),
      ).toBe(true);
    });

    it('treats null localSelectedChainIds as "all networks selected"', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          localSelectedChainIds={null}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.areAllNetworksSelected).toBe(true);
    });

    it('treats a non-null localSelectedChainIds as a specific selection', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          localSelectedChainIds={['eip155:1']}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.areAllNetworksSelected).toBe(false);
    });

    it('calls onLocalNetworkSelect and dismissModal when a network is selected', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      networkList.props.onSelectNetwork('eip155:137');

      expect(mockOnLocalNetworkSelect).toHaveBeenCalledWith(['eip155:137']);
      expect(mockDismissModal).toHaveBeenCalled();
    });

    it('calls onLocalNetworkSelect(null) and dismissModal when "all networks" is selected', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      networkList.props.selectAllNetworksComponent.props.onPress();

      expect(mockOnLocalNetworkSelect).toHaveBeenCalledWith(null);
      expect(mockDismissModal).toHaveBeenCalled();
    });

    it('works without a dismissModal prop', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          dismissModal={undefined}
        />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(() => networkList.props.onSelectNetwork('eip155:1')).not.toThrow();
      expect(mockOnLocalNetworkSelect).toHaveBeenCalledWith(['eip155:1']);
    });
  });

  describe('select all networks component', () => {
    it('renders with correct title and press handler', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const selectAllComponent = networkList.props.selectAllNetworksComponent;

      expect(selectAllComponent.props.title).toBe(
        'networks.all_popular_networks',
      );
      expect(typeof selectAllComponent.props.onPress).toBe('function');
    });
  });

  describe('custom network functionality', () => {
    it('always renders the custom network component', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.additionalNetworksComponent).toBeTruthy();
      expect(networkList.props.additionalNetworksComponent.props.testID).toBe(
        NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER,
      );
    });

    it('passes correct customNetworkProps to CustomNetwork', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkChild = customNetworkComponent.props.children;
      const customNetworkProps = customNetworkChild.props;

      expect(customNetworkProps.switchTab).toBeUndefined();
      expect(customNetworkProps.shouldNetworkSwitchPopToWallet).toBe(false);
      expect(customNetworkProps.showCompletionMessage).toBe(false);
      expect(customNetworkProps.showPopularNetworkModal).toBe(true);
      expect(customNetworkProps.allowNetworkSwitch).toBe(false);
      expect(customNetworkProps.hideWarningIcons).toBe(true);
      expect(customNetworkProps.isNetworkModalVisible).toBe(false);
      expect(customNetworkProps.skipConfirmation).toBe(true);
      expect(typeof customNetworkProps.closeNetworkModal).toBe('function');
      expect(typeof customNetworkProps.toggleWarningModal).toBe('function');
      expect(typeof customNetworkProps.showNetworkModal).toBe('function');
      expect(typeof customNetworkProps.onNetworkAdd).toBe('function');
    });

    it('adds a new popular network via Redux and locally selects it, so the lists filter to it immediately', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkProps = customNetworkComponent.props.children.props;

      const newNetwork = {
        chainId: '0x89',
        nickname: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        ticker: 'MATIC',
        warning: false,
      };

      await customNetworkProps.onNetworkAdd(newNetwork);

      expect(mockAddPopularNetwork).toHaveBeenCalledWith(newNetwork);
      expect(mockOnLocalNetworkSelect).toHaveBeenCalledWith(['eip155:137']);
    });

    it('re-enables all popular networks in Redux after adding one, so switching back to "all popular networks" is not left showing only the new network', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkProps =
        networkList.props.additionalNetworksComponent.props.children.props;

      await customNetworkProps.onNetworkAdd({
        chainId: '0x89',
        nickname: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        ticker: 'MATIC',
        warning: false,
      });

      // addPopularNetwork exclusively enables just the new network in
      // NetworkEnablementController; this call must undo that side effect.
      expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
    });

    it('dismisses the modal after adding a network, so the stale nav-params selection state is never shown', async () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkProps =
        networkList.props.additionalNetworksComponent.props.children.props;

      await customNetworkProps.onNetworkAdd({
        chainId: '0x89',
        nickname: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        ticker: 'MATIC',
        warning: false,
      });

      expect(mockDismissModal).toHaveBeenCalled();
    });
  });

  describe('modal state management', () => {
    it('modal state starts with correct initial values', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkProps = customNetworkComponent.props.children.props;

      expect(customNetworkProps.isNetworkModalVisible).toBe(false);
      expect(customNetworkProps.selectedNetwork).toBeUndefined();
    });

    it('does not throw when showNetworkModal is invoked with a network warning', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      const customNetworkComponent =
        networkList.props.additionalNetworksComponent;
      const customNetworkProps = customNetworkComponent.props.children.props;

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
  });

  describe('NETWORK_SWITCHED event tracking', () => {
    const mockBase = createMockNetwork('Base', 'eip155:8453', false);
    const mockSolana = createMockNetwork(
      'Solana',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      false,
    );
    const mockBitcoin = createMockNetwork(
      'Bitcoin',
      'bip122:000000000019d6689c085ae165831e93',
      false,
    );

    const renderSelector = (localSelectedChainIds: CaipChainId[] | null) => {
      mockUseNetworksToUse.mockReturnValue({
        networksToUse: [
          mockEthereum,
          mockPolygon,
          mockBase,
          mockSolana,
          mockBitcoin,
        ],
        evmNetworks: [mockEthereum, mockPolygon, mockBase],
        solanaNetworks: [mockSolana],
        bitcoinNetworks: [mockBitcoin],
        tronNetworks: [],
        stellarNetworks: [],
        selectedEvmAccount: null,
        selectedSolanaAccount: null,
        selectedBitcoinAccount: null,
        selectedTronAccount: null,
        selectedStellarAccount: null,
        areAllNetworksSelectedCombined: localSelectedChainIds == null,
        areAllEvmNetworksSelected: false,
        areAllSolanaNetworksSelected: false,
        areAllBitcoinNetworksSelected: false,
        areAllTronNetworksSelected: false,
        areAllStellarNetworksSelected: false,
      });

      return renderWithProvider(
        <NetworkMultiSelector
          {...defaultRenderProps}
          localSelectedChainIds={localSelectedChainIds}
        />,
      );
    };

    it('tracks NETWORK_SWITCHED when switching between EVM networks', () => {
      const { getByTestId } = renderSelector(['eip155:1']);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        'eip155:8453',
      );

      expect(mockTrackEvent.mock.calls[0][0].properties).toMatchObject({
        chain_id: '8453',
        from_network: 'Ethereum Mainnet',
        to_network: 'Base',
        source: 'Network Filter',
      });
    });

    it('uses the locally selected network as from_network, not Ethereum', () => {
      const { getByTestId } = renderSelector(['eip155:8453']);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        'eip155:137',
      );

      expect(mockTrackEvent.mock.calls[0][0].properties.from_network).toBe(
        'Base',
      );
      expect(mockTrackEvent.mock.calls[0][0].properties.from_network).not.toBe(
        'Ethereum Mainnet',
      );
    });

    it('tracks NETWORK_SWITCHED when switching between non-EVM networks', () => {
      const bitcoinChainId = 'bip122:000000000019d6689c085ae165831e93';
      const { getByTestId } = renderSelector([
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        bitcoinChainId,
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            chain_id: bitcoinChainId,
            from_network: 'Solana',
            to_network: 'Bitcoin',
            source: 'Network Filter',
          }),
        }),
      );
    });

    it('uses the locally selected non-EVM network as from_network when switching to EVM', () => {
      const { getByTestId } = renderSelector([
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        'eip155:1',
      );

      expect(mockTrackEvent.mock.calls[0][0].properties.from_network).toBe(
        'Solana',
      );
      expect(mockTrackEvent.mock.calls[0][0].properties.from_network).not.toBe(
        'Ethereum Mainnet',
      );
    });

    it('tracks NETWORK_SWITCHED when switching from all popular networks to a specific network', () => {
      const { getByTestId } = renderSelector(null);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        'eip155:1',
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            chain_id: '1',
            from_network: 'networks.all_popular_networks',
            to_network: 'Ethereum Mainnet',
            source: 'Network Filter',
          }),
        }),
      );
    });

    it('tracks NETWORK_SWITCHED when switching from a specific network to all popular networks', () => {
      const { getByTestId } = renderSelector(['eip155:1']);

      getByTestId(
        'mock-network-multi-selector-list',
      ).props.selectAllNetworksComponent.props.onPress();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            chain_id: '1',
            from_network: 'Ethereum Mainnet',
            to_network: 'networks.all_popular_networks',
            source: 'Network Filter',
          }),
        }),
      );
    });

    it('does not track NETWORK_SWITCHED when selecting the same network', () => {
      const { getByTestId } = renderSelector(['eip155:1']);

      getByTestId('mock-network-multi-selector-list').props.onSelectNetwork(
        'eip155:1',
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('memo optimization', () => {
    it('component is exported and functional', () => {
      expect(NetworkMultiSelector).toBeDefined();
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER),
      ).toBeTruthy();
    });
  });
});
