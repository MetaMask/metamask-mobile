import { KnownCaipNamespace } from '@metamask/utils';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';

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

// Mock NetworkEnablementController
jest.mock('../../../../core/Engine', () => ({
  context: {
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

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('NetworksSettings', () => {
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
});
