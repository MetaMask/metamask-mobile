import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate, { migrationVersion, HYPEREVM_CHAIN_ID } from './120';
import { Hex } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
  addFailoverUrlToNetworkConfiguration:
    jest.requireActual('./util').addFailoverUrlToNetworkConfiguration, // Actual one
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const QUICKNODE_HYPEREVM_URL = 'https://failover.com';

const mainnetConfiguration = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://explorer.com'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        type: 'custom',
        url: 'https://mainnet.com',
      },
    ],
  },
};

const hyperevmInitialConfiguration = {
  [HYPEREVM_CHAIN_ID]: {
    chainId: HYPEREVM_CHAIN_ID,
    name: 'HyperEVM',
    nativeCurrency: 'HYPE',
    blockExplorerUrls: ['https://hyperevmscan.io/'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'hyperevm',
        type: 'custom',
        url: 'https://rpc.hyperliquid.xyz/evm',
      },
    ],
  },
};

interface RpcEndpoint {
  failoverUrls?: string[];
  name?: string;
  networkClientId: string;
  url: string;
  type: string;
}

interface NetworkConfiguration {
  blockExplorerUrls: string[];
  chainId: Hex;
  defaultBlockExplorerUrlIndex?: number;
  defaultRpcEndpointIndex: number;
  name: string;
  nativeCurrency: string;
  rpcEndpoints: RpcEndpoint[];
}

const unitTestInfuraId = 'unitTestInfuraId';

const NEW_TEST_INFURA_ENDPOINT = `https://hyperevm-mainnet.infura.io/v3/${unitTestInfuraId}`;

export const HYPEREVM_CLEAN_CONFIG: NetworkConfiguration = {
  chainId: HYPEREVM_CHAIN_ID,
  name: 'HyperEVM',
  nativeCurrency: 'HYPE',
  blockExplorerUrls: ['https://hyperevmscan.io/'],
  defaultRpcEndpointIndex: 0,
  defaultBlockExplorerUrlIndex: 0,
  rpcEndpoints: [
    {
      failoverUrls: [QUICKNODE_HYPEREVM_URL],
      networkClientId: 'hyperevm',
      type: 'custom',
      url: NEW_TEST_INFURA_ENDPOINT,
    },
  ],
};

describe(`migration #${migrationVersion}`, () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    originalEnv = { ...process.env };
    process.env.MM_INFURA_PROJECT_ID = unitTestInfuraId;
    process.env.QUICKNODE_HYPEREVM_URL = QUICKNODE_HYPEREVM_URL;
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
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  const invalidStates = [
    {
      state: {
        engine: {},
      },
      scenario: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      scenario: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      scenario: 'invalid NetworkController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
      },
      scenario: 'missing networkConfigurationsByChainId property',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: 'invalid',
            },
          },
        },
      },
      scenario: 'invalid networkConfigurationsByChainId state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [HYPEREVM_CHAIN_ID]: {
                  chainId: HYPEREVM_CHAIN_ID,
                  name: 'HyperEVM',
                  nativeCurrency: 'HYPE',
                  blockExplorerUrls: ['https://hyperevmscan.io/'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'hyperevm',
                      type: 'custom',
                      url: 'https://rpc.hyperliquid.xyz/evm',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      scenario: 'selectedNetworkClientId is missing',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: {},
              networkConfigurationsByChainId: {
                [HYPEREVM_CHAIN_ID]: {
                  chainId: HYPEREVM_CHAIN_ID,
                  name: 'HyperEVM',
                  nativeCurrency: 'HYPE',
                  blockExplorerUrls: ['https://hyperevmscan.io/'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'HYPE',
                      type: 'custom',
                      url: 'https://rpc.hyperliquid.xyz/evm',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      scenario: 'selectedNetworkClientId is not a string',
    },
  ];

  it.each(invalidStates)('captures exception if $scenario', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('keeps config as is without error, if already clean', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [HYPEREVM_CHAIN_ID]: HYPEREVM_CLEAN_CONFIG,
            },
          },
        },
      },
    };

    const expectedState = cloneDeep(orgState);

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(mockedCaptureException).not.toHaveBeenCalled();

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('merges the existing HyperEVM network configuration if there is one', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...hyperevmInitialConfiguration,
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                rpcEndpoints: [
                  {
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                    failoverUrls: [QUICKNODE_HYPEREVM_URL], // Added to all RPCs
                  },
                  {
                    ...HYPEREVM_CLEAN_CONFIG.rpcEndpoints[0],
                    networkClientId: 'mock-uuid',
                  },
                ],
                defaultRpcEndpointIndex: 1,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(mockedCaptureException).not.toHaveBeenCalled();

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('keeps original RPC if no infura key is found, but adds failover', async () => {
    delete process.env.MM_INFURA_PROJECT_ID;

    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...hyperevmInitialConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                name: 'HyperEVM',
                nativeCurrency: 'HYPE',
                rpcEndpoints: [
                  {
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                rpcEndpoints: hyperevmInitialConfiguration[
                  HYPEREVM_CHAIN_ID
                ].rpcEndpoints.map((endpoint) => ({
                  ...endpoint,
                  failoverUrls: [QUICKNODE_HYPEREVM_URL], // Added to all RPCs
                })),
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Infura project ID is not set, skip the HyperEVM RPC migration',
        ),
      }),
    );

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('does not add failover URL if there is already a failover URL', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...hyperevmInitialConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                name: 'HyperEVM',
                nativeCurrency: 'HYPE',
                rpcEndpoints: [
                  {
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                    failoverUrls: ['https://existingFailover'],
                  },
                ],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                rpcEndpoints: [
                  {
                    // Untouched first endpoint, including existing failover
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                    failoverUrls: ['https://existingFailover'],
                  },
                  {
                    // New endpoint, including QuickNode failover
                    networkClientId: 'mock-uuid',
                    url: NEW_TEST_INFURA_ENDPOINT,
                    type: 'custom',
                    failoverUrls: [QUICKNODE_HYPEREVM_URL],
                  },
                ],
                defaultRpcEndpointIndex: 1,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(mockedCaptureException).not.toHaveBeenCalled();

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('does not add failover URL if QUICKNODE_HYPEREVM_URL env variable is not set', async () => {
    delete process.env.QUICKNODE_HYPEREVM_URL;

    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...hyperevmInitialConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                name: 'HyperEVM',
                nativeCurrency: 'HYPE',
                rpcEndpoints: [
                  {
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                    failoverUrls: ['https://existingFailover'],
                  },
                ],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                rpcEndpoints: [
                  {
                    // Untouched first endpoint, including existing failover
                    networkClientId: 'hyperevm',
                    url: 'https://rpc.hyperliquid.xyz/evm',
                    type: 'custom',
                    failoverUrls: ['https://existingFailover'],
                  },
                  {
                    // New endpoint, missing QuickNode failover because of the missing env var
                    networkClientId: 'mock-uuid',
                    url: NEW_TEST_INFURA_ENDPOINT,
                    type: 'custom',
                    failoverUrls: [],
                  },
                ],
                defaultRpcEndpointIndex: 1,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://hyperevmscan.io/'],
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(mockedCaptureException).not.toHaveBeenCalled();

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('returns the original state if the HyperEVM network configuration exists but is invalid', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                name: 'HyperEVM',
                nativeCurrency: 'HYPE',
                rpcEndpoints: 'invalid',
              },
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [HYPEREVM_CHAIN_ID]: {
                ...HYPEREVM_CLEAN_CONFIG,
                name: 'HyperEVM',
                nativeCurrency: 'HYPE',
                rpcEndpoints: 'invalid',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(migratedState).toStrictEqual(expectedState);
  });
});
