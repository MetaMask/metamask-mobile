import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import migrate from './109';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.spyOn(
  jest.requireActual('./util'),
  'ensureValidState',
);

const migrationVersion = 109;
const QUICKNODE_MONAD_URL = 'https://failover.com';
const MONAD_CHAIN_ID = '0x8f';

// Helper functions to reduce duplication
const createEthereumMainnetConfig = () => ({
  chainId: '0x1',
  rpcEndpoints: [
    {
      networkClientId: 'mainnet',
      url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      type: 'infura',
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://etherscan.io'],
  defaultBlockExplorerUrlIndex: 0,
  name: 'Ethereum Mainnet',
  nativeCurrency: 'ETH',
});

const createMonadNetworkConfig = (options?: {
  rpcEndpoints?: {
    networkClientId: string;
    url: string;
    type: string;
    name?: string;
    failoverUrls?: string[];
  }[];
}) => ({
  chainId: MONAD_CHAIN_ID,
  rpcEndpoints: options?.rpcEndpoints || [
    {
      networkClientId: 'monad-network',
      url: 'https://monad-mainnet.infura.io/v3/{infuraProjectId}',
      type: 'custom',
      name: 'Monad Network',
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://monadscan.com'],
  defaultBlockExplorerUrlIndex: 0,
  name: 'Monad Network',
  nativeCurrency: 'MON',
});

const createNetworkControllerState = (
  networkConfigs: Record<string, unknown>,
) => ({
  selectedNetworkClientId: 'mainnet',
  networksMetadata: {},
  networkConfigurationsByChainId: networkConfigs,
});

const createState = (networkConfigs: Record<string, unknown>) => ({
  engine: {
    backgroundState: {
      NetworkController: createNetworkControllerState(networkConfigs),
    },
  },
});

describe(`migration #${migrationVersion}`, () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    originalEnv = { ...process.env };
  });

  afterEach(() => {
    for (const key of new Set([
      ...Object.keys(originalEnv),
      ...Object.keys(process.env),
    ])) {
      if (originalEnv[key]) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    // ensureValidState may call captureException for invalid states
    // but the migration should still return the state unchanged
  });

  const invalidStates = [
    {
      state: {
        engine: {
          backgroundState: {
            settings: {},
          },
        },
        settings: {},
        security: {},
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state structure: missing required properties`,
      scenario: 'missing NetworkController',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
            settings: {},
          },
        },
        settings: {},
        security: {},
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state: 'string'`,
      scenario: 'invalid NetworkController type',
    },
    {
      state: {
        engine: { backgroundState: { NetworkController: 'invalid' } },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state: 'string'`,
      scenario: 'invalid NetworkController state',
    },
    {
      state: {
        engine: { backgroundState: { NetworkController: {} } },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
      scenario: 'missing networkConfigurationsByChainId property',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: { networkConfigurationsByChainId: 'invalid' },
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: 'string'`,
      scenario: 'invalid networkConfigurationsByChainId state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [MONAD_CHAIN_ID]: 'invalid',
              },
            },
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid Monad network configuration: 'string'`,
      scenario: 'invalid Monad network configuration',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [MONAD_CHAIN_ID]: {
                  chainId: MONAD_CHAIN_ID,
                  defaultRpcEndpointIndex: 0,
                  blockExplorerUrls: ['https://monadscan.com'],
                  defaultBlockExplorerUrlIndex: 0,
                  name: 'Custom Monad Network',
                  nativeCurrency: 'MON',
                },
              },
            },
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid Monad network configuration: missing rpcEndpoints property`,
      scenario: 'missing rpcEndpoints property in Monad network configuration',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [MONAD_CHAIN_ID]: {
                  chainId: MONAD_CHAIN_ID,
                  rpcEndpoints: 'not-an-array',
                  defaultRpcEndpointIndex: 0,
                  blockExplorerUrls: ['https://monadscan.com'],
                  defaultBlockExplorerUrlIndex: 0,
                  name: 'Custom Monad Network',
                  nativeCurrency: 'MON',
                },
              },
            },
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid Monad network rpcEndpoints: expected array, got 'string'`,
      scenario: 'rpcEndpoints is not an array in Monad network configuration',
    },
  ];

  it.each(invalidStates)(
    'captures exception if $scenario',
    ({ errorMessage, state }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    },
  );

  it('does not modify state and does not capture exception if Monad network is not found', () => {
    const state = createState({
      '0x1': createEthereumMainnetConfig(),
    });
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not add failover URL if there is already a failover URL', async () => {
    const oldState = createState({
      '0x1': createEthereumMainnetConfig(),
      [MONAD_CHAIN_ID]: createMonadNetworkConfig({
        rpcEndpoints: [
          {
            networkClientId: 'monad-network',
            url: 'https://monad-mainnet.infura.io/v3/{infuraProjectId}',
            type: 'custom',
            name: 'Monad Network',
            failoverUrls: ['https://failover.com'],
          },
        ],
      }),
    });

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('does not add failover URL if QUICKNODE_MONAD_URL env variable is not set', async () => {
    const oldState = createState({
      '0x1': createEthereumMainnetConfig(),
      [MONAD_CHAIN_ID]: createMonadNetworkConfig(),
    });

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('adds QuickNode failover URL to all Monad RPC endpoints when no failover URLs exist', async () => {
    process.env.QUICKNODE_MONAD_URL = QUICKNODE_MONAD_URL;
    const monadRpcEndpoints = [
      {
        networkClientId: 'monad-network',
        url: 'https://monad-mainnet.infura.io/v3/{infuraProjectId}',
        type: 'custom',
        name: 'Monad Network',
      },
      {
        networkClientId: 'monad-network-2',
        url: 'http://some-monad-rpc.com',
        type: 'custom',
        name: 'Monad Network',
      },
    ];
    const oldState = createState({
      '0x1': createEthereumMainnetConfig(),
      [MONAD_CHAIN_ID]: createMonadNetworkConfig({
        rpcEndpoints: monadRpcEndpoints,
      }),
    });

    mockedEnsureValidState.mockReturnValue(true);

    const monadNetworkConfig = createMonadNetworkConfig({
      rpcEndpoints: monadRpcEndpoints,
    });
    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              [MONAD_CHAIN_ID]: {
                ...monadNetworkConfig,
                rpcEndpoints: monadRpcEndpoints.map((endpoint) => ({
                  ...endpoint,
                  failoverUrls: [QUICKNODE_MONAD_URL],
                })),
              },
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedData);
  });
});
