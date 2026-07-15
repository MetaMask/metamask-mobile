import migrate, { migrationVersion } from './118';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn((_state: unknown, _version: number) => true),
}));

const mockedEnsureValidState = jest.mocked(
  jest.requireMock<{ ensureValidState: (s: unknown, v: number) => boolean }>(
    './util',
  ).ensureValidState,
);

interface MigrationState {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: Record<string, NetworkConfiguration>;
      };
    };
  };
}

describe(`Migration ${migrationVersion}`, () => {
  const megaEthChainId = NETWORK_CHAIN_ID.MEGAETH_MAINNET;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  const createTestState = (networkConfig?: NetworkConfiguration): unknown => ({
    meta: { version: migrationVersion - 1 },
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: networkConfig
            ? { [megaEthChainId]: networkConfig }
            : {},
        },
      },
    },
  });

  describe('ensureValidState validation', () => {
    it('returns original state if state version is >= migration version', () => {
      mockedEnsureValidState.mockReturnValue(false);
      const oldState = {
        meta: { version: migrationVersion },
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {},
            },
          },
        },
      };

      const result = migrate(oldState);
      expect(result).toBe(oldState);
    });

    it('returns original state if engine is missing', () => {
      const oldState = { meta: { version: migrationVersion - 1 } };
      const result = migrate(oldState);
      expect(result).toBe(oldState);
    });

    it('returns original state if NetworkController is missing', () => {
      const oldState = {
        meta: { version: migrationVersion - 1 },
        engine: {
          backgroundState: {},
        },
      };
      const result = migrate(oldState);
      expect(result).toBe(oldState);
    });
  });

  describe('NetworkController state transformations', () => {
    it('updates MegaETH Mainnet name from MegaEth to MegaETH', () => {
      const oldState = createTestState({
        chainId: megaEthChainId,
        name: 'MegaEth',
        rpcEndpoints: [
          {
            networkClientId: 'test-id',
            url: 'https://mainnet.megaeth.com/rpc',
            type: RpcEndpointType.Custom,
            name: 'MegaEth',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [],
        nativeCurrency: 'ETH',
      });

      const result = migrate(oldState);

      const resultState = result as MigrationState;
      const migratedConfig =
        resultState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[megaEthChainId];

      expect(migratedConfig.name).toBe('MegaETH');
      expect(migratedConfig.rpcEndpoints[0].name).toBe('MegaETH');
    });

    it('updates only RPC endpoint name if network name is already correct', () => {
      const oldState = createTestState({
        chainId: megaEthChainId,
        name: 'MegaETH',
        rpcEndpoints: [
          {
            networkClientId: 'test-id',
            url: 'https://mainnet.megaeth.com/rpc',
            type: RpcEndpointType.Custom,
            name: 'MegaEth',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [],
        nativeCurrency: 'ETH',
      });

      const result = migrate(oldState);

      const resultState = result as MigrationState;
      const migratedConfig =
        resultState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[megaEthChainId];

      expect(migratedConfig.name).toBe('MegaETH');
      expect(migratedConfig.rpcEndpoints[0].name).toBe('MegaETH');
    });

    it('leaves network unchanged if name is not MegaEth', () => {
      const oldState = createTestState({
        chainId: megaEthChainId,
        name: 'MegaETH Mainnet',
        rpcEndpoints: [
          {
            networkClientId: 'test-id',
            url: 'https://mainnet.megaeth.com/rpc',
            type: RpcEndpointType.Custom,
            name: 'MegaETH Mainnet',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [],
        nativeCurrency: 'ETH',
      });

      const result = migrate(oldState);

      const resultState = result as MigrationState;
      const migratedConfig =
        resultState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[megaEthChainId];

      expect(migratedConfig.name).toBe('MegaETH Mainnet');
      expect(migratedConfig.rpcEndpoints[0].name).toBe('MegaETH Mainnet');
    });

    it('returns original state if MegaETH Mainnet is not in state', () => {
      const oldState = createTestState();
      const result = migrate(oldState);
      expect(result).toBe(oldState);
    });

    it('handles multiple RPC endpoints correctly', () => {
      const oldState = createTestState({
        chainId: megaEthChainId,
        name: 'MegaEth',
        rpcEndpoints: [
          {
            networkClientId: 'test-id-1',
            url: 'https://mainnet.megaeth.com/rpc',
            type: RpcEndpointType.Custom,
            name: 'MegaEth',
          },
          {
            networkClientId: 'test-id-2',
            url: 'https://mainnet.megaeth.com/rpc2',
            type: RpcEndpointType.Custom,
            name: 'MegaEth',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [],
        nativeCurrency: 'ETH',
      });

      const result = migrate(oldState);

      const resultState = result as MigrationState;
      const migratedConfig =
        resultState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[megaEthChainId];

      expect(migratedConfig.name).toBe('MegaETH');
      expect(migratedConfig.rpcEndpoints[0].name).toBe('MegaETH');
      expect(migratedConfig.rpcEndpoints[1].name).toBe('MegaETH');
    });
  });
});
