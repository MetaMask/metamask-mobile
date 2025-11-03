// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

// Internal dependencies.
import RpcSelectionModal from './RpcSelectionModal';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import Engine from '../../../../core/Engine/Engine';
import { useSelector } from 'react-redux';
import {
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';
import { Hex } from '@metamask/utils';

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  getNetworkImageSource: jest.fn(),
  mainnet: {
    name: 'Ethereum Main Network',
  },
}));
const { PreferencesController, NetworkController } = Engine.context;

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurations: {
          [CHAIN_IDS.MAINNET]: {
            rpcEndpoints: [
              {
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://etherscan.io'],
            chainId: CHAIN_IDS.MAINNET,
            name: 'Ethereum Mainnet',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            rpcEndpoints: [
              {
                url: 'https://linea.infura.io/v3/{infuraProjectId}',
                networkClientId: 'lineaMainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.io'],
            chainId: CHAIN_IDS.LINEA_MAINNET,
            name: 'Linea Mainnet',
            nativeCurrency: {
              name: 'Linea Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
          '0x999': {
            rpcEndpoints: [
              {
                url: 'https://test.infura.io/v3/{infuraProjectId}',
                networkClientId: 'testMainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.io'],
            chainId: '0x999',
            name: 'Test Mainnet',
            nativeCurrency: {
              name: 'Test Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
  };
});

jest.mock('../../../../core/Engine/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
      updateNetwork: jest.fn(),
      getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x1' }),
      findNetworkClientIdByChainId: jest
        .fn()
        .mockReturnValue({ chainId: '0x1' }),
      getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
        blockExplorerUrls: [],
        chainId: '0x1',
        defaultRpcEndpointIndex: 0,
        name: 'Mainnet',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: 'mainnet',
            type: 'infura',
            url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
          },
        ],
      }),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: () => ({
      networks: [],
      selectNetwork: jest.fn(),
      selectCustomNetwork: jest.fn(),
      selectPopularNetwork: jest.fn(),
    }),
    NetworkType: {
      Popular: 'popular',
      Custom: 'custom',
    },
  }),
);

jest.mock('../../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
    selectNetwork: jest.fn(),
  }),
}));

const mockNetworks: Record<Hex, NetworkConfiguration> = {
  [NETWORK_CHAIN_ID.MAINNET]: {
    blockExplorerUrls: ['https://etherscan.io'],
    chainId: NETWORK_CHAIN_ID.MAINNET,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        url: 'https://mainnet.infura.io/v3',
        networkClientId: NETWORK_CHAIN_ID.MAINNET,
        type: RpcEndpointType.Custom,
        name: 'Ethereum',
      },
    ],
  },
  [NETWORK_CHAIN_ID.POLYGON]: {
    blockExplorerUrls: ['https://polygonscan.com'],
    chainId: NETWORK_CHAIN_ID.POLYGON,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Polygon Mainnet',
    nativeCurrency: 'MATIC',
    rpcEndpoints: [
      {
        url: 'https://polygon-rpc.com',
        name: 'Polygon',
        networkClientId: NETWORK_CHAIN_ID.POLYGON,
        type: RpcEndpointType.Custom,
      },
    ],
  },
};

describe('RpcSelectionModal', () => {
  const mockRpcMenuSheetRef = {
    current: {
      onOpenBottomSheet: jest.fn(),
      onCloseBottomSheet: jest.fn(),
    },
  };

  const defaultProps = {
    showMultiRpcSelectModal: {
      isVisible: true,
      chainId: CHAIN_IDS.MAINNET,
      networkName: 'Mainnet',
    },
    closeRpcModal: jest.fn(),
    rpcMenuSheetRef: mockRpcMenuSheetRef,
    networkConfigurations: MOCK_STORE_STATE.engine.backgroundState
      .NetworkController.networkConfigurations as unknown as Record<
      string,
      NetworkConfiguration
    >,

    styles: {
      baseHeader: {},
      cellBorder: {},
      rpcMenu: {},
      rpcText: {},
      textCentred: {},
      alternativeText: {},
    },
  };

  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkConfigurations) {
        return mockNetworks; // to show all networks
      }
      return null;
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly when visible', () => {
    const { toJSON } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should not render when not visible', () => {
    const { queryByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          ...defaultProps.showMultiRpcSelectModal,
          isVisible: false,
        }}
      />,
    );
    expect(queryByText('Mainnet')).toBeNull();
  });

  it('should display the correct network name for Ethereum Mainnet', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    expect(getByText('Mainnet')).toBeTruthy();
  });

  it('should display the correct network name for Linea Mainnet', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          isVisible: true,
          chainId: CHAIN_IDS.LINEA_MAINNET,
          networkName: 'Linea Mainnet',
        }}
      />,
    );
    expect(getByText('Linea Mainnet')).toBeTruthy();
  });

  it('should call onRpcSelect and closeRpcModal when an RPC is selected', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    const rpcUrlElement = getByText('mainnet.infura.io/v3');

    fireEvent.press(rpcUrlElement);
    expect(NetworkController.updateNetwork).toHaveBeenCalled();
    expect(defaultProps.closeRpcModal).toHaveBeenCalled();
  });

  it('should handle no RPC endpoints gracefully', () => {
    const { queryByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          ...defaultProps.showMultiRpcSelectModal,
          chainId: '0x2',
        }}
      />,
    );

    expect(queryByText('mainnet.infura.io')).toBeNull(); // Should not render any RPC URLs
  });

  it('should call preferences controller setTokenNetworkFilter', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    const rpcUrlElement = getByText('mainnet.infura.io/v3');
    fireEvent.press(rpcUrlElement);
    expect(PreferencesController.setTokenNetworkFilter).toHaveBeenCalledTimes(
      1,
    );
  });

  it('should not call preferences controller setTokenNetworkFilter when a popular networks filter is selected', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAllNetworks) {
        return true; // to show all networks
      }
      return null;
    });
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    const rpcUrlElement = getByText('mainnet.infura.io/v3');
    fireEvent.press(rpcUrlElement);
    expect(PreferencesController.setTokenNetworkFilter).toHaveBeenCalledTimes(
      0,
    );
  });

  it('should not call preferences controller setTokenNetworkFilter when the network is not part of PopularList', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAllNetworks) {
        return false; // to show current network
      }
      return null;
    });
    const { getByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          isVisible: true,
          chainId: '0x999',
          networkName: 'Test Mainnet',
        }}
      />,
    );
    const rpcUrlElement = getByText('test.infura.io/v3');
    fireEvent.press(rpcUrlElement);
    expect(PreferencesController.setTokenNetworkFilter).toHaveBeenCalledTimes(
      0,
    );
  });

  describe('Network Manager Integration', () => {
    it('calls updateNetwork when RPC is selected', () => {
      const { getByText } = renderWithProvider(
        <RpcSelectionModal {...defaultProps} />,
      );
      const rpcUrlElement = getByText('mainnet.infura.io/v3');

      fireEvent.press(rpcUrlElement);

      expect(NetworkController.updateNetwork).toHaveBeenCalled();
      expect(defaultProps.closeRpcModal).toHaveBeenCalled();
    });

    it('initializes with Engine controllers available', () => {
      expect(NetworkController.updateNetwork).toBeDefined();
      expect(PreferencesController.setTokenNetworkFilter).toBeDefined();
    });

    it('renders with default props', () => {
      const { getByText } = renderWithProvider(
        <RpcSelectionModal {...defaultProps} />,
      );

      expect(getByText('Mainnet')).toBeTruthy();
    });
  });
});
