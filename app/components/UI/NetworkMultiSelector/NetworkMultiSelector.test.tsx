import React from 'react';
import { render } from '@testing-library/react-native';
import { KnownCaipNamespace } from '@metamask/utils';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  useNetworksByNamespace,
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
  NetworkType: {
    Popular: 'Popular',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(),
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
  const mockUseNetworkSelection = useNetworkSelection as jest.MockedFunction<
    typeof useNetworkSelection
  >;

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

  // TODO: Refactor tests - they aren't up to par
  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );
      expect(
        getByTestId(NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER),
      ).toBeTruthy();
    });

    it('calls useNetworkEnablement', () => {
      render(<NetworkMultiSelector openModal={mockOpenModal} />);
      expect(mockUseNetworkEnablement).toHaveBeenCalled();
    });

    it('calls useNetworksByNamespace with Popular network type', () => {
      render(<NetworkMultiSelector openModal={mockOpenModal} />);
      expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
      });
    });

    it('calls useNetworkSelection with networks', () => {
      render(<NetworkMultiSelector openModal={mockOpenModal} />);
      expect(mockUseNetworkSelection).toHaveBeenCalledWith({
        networks: mockNetworks,
      });
    });

    it('renders NetworkMultiSelectorList', () => {
      const { getByTestId } = render(
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
      expect(networkList.props.onSelectNetwork).toBe(mockSelectPopularNetwork);
      expect(networkList.props.additionalNetworksComponent).toBeTruthy();
    });

    it('passes null additionalNetworksComponent for non-EIP155 namespace', () => {
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
      });

      const { getByTestId } = render(
        <NetworkMultiSelector openModal={mockOpenModal} />,
      );

      const networkList = getByTestId('mock-network-multi-selector-list');
      expect(networkList.props.additionalNetworksComponent).toBeNull();
    });
  });
});
