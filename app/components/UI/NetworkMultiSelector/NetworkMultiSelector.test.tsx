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
  const mockUseSelector = jest.mocked(useSelector);

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

    mockUseSelector.mockReturnValue([]);
  });

  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = renderWithProvider(
        <NetworkMultiSelector {...defaultRenderProps} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER),
      ).toBeTruthy();
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

    it('adds a new popular network via Redux (unaffected by local selection)', async () => {
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
      expect(mockOnLocalNetworkSelect).not.toHaveBeenCalled();
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
