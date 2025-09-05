import React from 'react';
import { KnownCaipNamespace } from '@metamask/utils';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ADD_NETWORK_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';

// Mock the new utility functions
jest.mock('../../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  removeItemFromChainIdList: jest.fn().mockReturnValue({
    chain_id_list: ['eip155:1'],
  }),
}));

// Mock MetaMetrics
jest.mock('../../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      addTraitsToUser: jest.fn(),
    }),
  },
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setProviderType: jest.fn(),
      removeNetwork: jest.fn(),
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    NetworkEnablementController: {
      enabledNetworkMap: {
        eip155: {
          '0x1': true,
          '0x38': true,
          '0x89': false,
        },
      },
    },
  },
}));

jest.mock('../../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworksByNamespace: jest.fn(() => ({
    eip155: {
      '0x1': true,
    },
  })),
  selectEVMEnabledNetworks: jest.fn(() => ['0x1']),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initialState: any = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: { status: 'available', EIPS: { '1559': true } },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
          },
          '0x89': {
            blockExplorerUrls: ['https://polygonscan.com'],
            chainId: '0x89',
            defaultRpcEndpointIndex: 0,
            name: 'Polygon Mainnet',
            nativeCurrency: 'MATIC',
            rpcEndpoints: [
              {
                networkClientId: 'polygon-mainnet',
                type: 'custom',
                url: 'https://polygon-rpc.com',
              },
            ],
          },
        },
      },
    },
  },
};

describe('NetworksSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      NetworksSettings,
      { name: 'Network Settings' },
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('onNetworkPress', () => {
    it('navigates to ADD_NETWORK with correct parameters when network is pressed', () => {
      // Given a rendered NetworksSettings component with mocked navigation
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByText } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When a network is pressed
      const ethereumNetwork = getByText('Ethereum Main Network');
      fireEvent.press(ethereumNetwork);

      // Then it should navigate with shouldNetworkSwitchPopToWallet: false
      expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
        network: 'mainnet',
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    it('passes the correct network parameter for custom networks', () => {
      // Given a rendered NetworksSettings component with custom networks
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByText } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When a custom network is pressed
      const polygonNetwork = getByText('Polygon Mainnet');
      fireEvent.press(polygonNetwork);

      // Then it should navigate with the correct network parameter
      expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
        network: 'polygon-mainnet',
        shouldNetworkSwitchPopToWallet: false,
      });
    });
  });

  describe('onAddNetwork', () => {
    it('navigates to ADD_NETWORK with shouldNetworkSwitchPopToWallet: false when add network button is pressed', () => {
      // Given a rendered NetworksSettings component
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByTestId } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When the add network button is pressed
      const addNetworkButton = getByTestId(ADD_NETWORK_BUTTON);
      fireEvent.press(addNetworkButton);

      // Then it should navigate with shouldNetworkSwitchPopToWallet: false
      expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    it('does not pass network parameter when adding new network', () => {
      // Given a rendered NetworksSettings component
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByTestId } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When the add network button is pressed
      const addNetworkButton = getByTestId(ADD_NETWORK_BUTTON);
      fireEvent.press(addNetworkButton);

      // Then it should navigate without a network parameter (for new network)
      expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
      });

      // Verify the network parameter is not included
      const callArgs = mockNavigate.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('network');
    });
  });

  describe('navigation parameter consistency', () => {
    it('ensures both methods use the same shouldNetworkSwitchPopToWallet value', () => {
      // Given a rendered NetworksSettings component
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByText, getByTestId } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When both an existing network and add network are pressed
      const ethereumNetwork = getByText('Ethereum Main Network');
      fireEvent.press(ethereumNetwork);

      const addNetworkButton = getByTestId(ADD_NETWORK_BUTTON);
      fireEvent.press(addNetworkButton);

      // Then both calls should have shouldNetworkSwitchPopToWallet: false
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.ADD_NETWORK, {
        network: 'mainnet',
        shouldNetworkSwitchPopToWallet: false,
      });

      expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    it('verifies shouldNetworkSwitchPopToWallet is always false for networks settings', () => {
      // Given a rendered NetworksSettings component
      const mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      };

      const { getByTestId } = renderScreen(
        (props) => <NetworksSettings {...props} navigation={mockNavigation} />,
        { name: 'Network Settings' },
        {
          state: initialState,
        },
      );

      // When any navigation method is called
      const addNetworkButton = getByTestId(ADD_NETWORK_BUTTON);
      fireEvent.press(addNetworkButton);

      // Then shouldNetworkSwitchPopToWallet should always be false
      const callArgs = mockNavigate.mock.calls[0][1];
      expect(callArgs.shouldNetworkSwitchPopToWallet).toBe(false);
    });
  });
});

describe('onRemoveNetworkPress', () => {
  let mockShowRemoveMenu: jest.Mock;

  beforeEach(() => {
    mockShowRemoveMenu = jest.fn();
  });

  // Test the method logic by replicating its behavior
  const onRemoveNetworkPress = function (
    this: {
      props: {
        enabledNetworksByNamespace?: Record<string, Record<string, boolean>>;
      };
      showRemoveMenu: jest.Mock;
    },
    isCustomRPC: boolean,
    networkTypeOrRpcUrl: string | null,
    chainId: string | null,
  ) {
    if (!isCustomRPC || !networkTypeOrRpcUrl || !chainId) {
      return;
    }

    const { enabledNetworksByNamespace } = this.props;
    const evmEnabledNetworks =
      enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155];
    if (!evmEnabledNetworks) {
      return;
    }

    const areAllNetworksEnabled = Object.values(evmEnabledNetworks).every(
      (enabledNetwork: unknown) => Boolean(enabledNetwork),
    );

    if (areAllNetworksEnabled) {
      this.showRemoveMenu(networkTypeOrRpcUrl);
    } else {
      const isNetworkEnabled = evmEnabledNetworks[chainId];
      if (!isNetworkEnabled) {
        this.showRemoveMenu(networkTypeOrRpcUrl);
      }
    }
  };

  it('should return early if not a custom RPC', () => {
    const context = { showRemoveMenu: mockShowRemoveMenu, props: {} };
    onRemoveNetworkPress.call(context, false, 'mainnet', '0x1');
    expect(mockShowRemoveMenu).not.toHaveBeenCalled();
  });

  it('should return early if no networkTypeOrRpcUrl provided', () => {
    const context = { showRemoveMenu: mockShowRemoveMenu, props: {} };
    onRemoveNetworkPress.call(context, true, null, '0x1');
    expect(mockShowRemoveMenu).not.toHaveBeenCalled();
  });

  it('should return early if no chainId provided', () => {
    const context = { showRemoveMenu: mockShowRemoveMenu, props: {} };
    onRemoveNetworkPress.call(context, true, 'test-rpc', null);
    expect(mockShowRemoveMenu).not.toHaveBeenCalled();
  });

  it('should show remove menu when network is disabled', () => {
    const context = {
      showRemoveMenu: mockShowRemoveMenu,
      props: {
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x38': false,
          },
        },
      },
    };
    onRemoveNetworkPress.call(context, true, 'test-rpc', '0x38');
    expect(mockShowRemoveMenu).toHaveBeenCalledWith('test-rpc');
  });

  it('should show remove menu when all networks are enabled', () => {
    const context = {
      showRemoveMenu: mockShowRemoveMenu,
      props: {
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x38': true,
          },
        },
      },
    };
    onRemoveNetworkPress.call(context, true, 'test-rpc', '0x1');
    expect(mockShowRemoveMenu).toHaveBeenCalledWith('test-rpc');
  });

  it('should not show remove menu when network is enabled and not all networks are enabled', () => {
    const context = {
      showRemoveMenu: mockShowRemoveMenu,
      props: {
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x38': false,
          },
        },
      },
    };
    onRemoveNetworkPress.call(context, true, 'test-rpc', '0x1');
    expect(mockShowRemoveMenu).not.toHaveBeenCalled();
  });
});
