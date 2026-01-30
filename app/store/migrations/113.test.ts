import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate, { migrationVersion, MEGAETH_MAINNET_CHAIN_ID } from './113';
import { Hex } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

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

const megaEthMainnetInitialConfiguration = {
  [MEGAETH_MAINNET_CHAIN_ID]: {
    chainId: MEGAETH_MAINNET_CHAIN_ID,
    name: 'MegaETH Mainnet',
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://explorer.com'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'megaeth-mainnet',
        type: 'custom',
        url: 'https://rpc.com',
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

export const MEGAETH_MAINNET_CLEAN_CONFIG: NetworkConfiguration = {
  chainId: MEGAETH_MAINNET_CHAIN_ID,
  name: 'MegaETH Mainnet',
  nativeCurrency: 'ETH',
  blockExplorerUrls: ['https://megaeth.blockscout.com/'],
  defaultRpcEndpointIndex: 0,
  defaultBlockExplorerUrlIndex: 0,
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'megaeth-mainnet',
      type: 'custom',
      url: `https://megaeth-mainnet.infura.io/v3/${unitTestInfuraId}`,
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
                [MEGAETH_MAINNET_CHAIN_ID]: {
                  chainId: MEGAETH_MAINNET_CHAIN_ID,
                  name: 'MegaETH mainnet',
                  nativeCurrency: 'MegaETH',
                  blockExplorerUrls: ['https://explorer.com'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'megaeth-mainnet',
                      type: 'custom',
                      url: 'https://rpc.com',
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
                [MEGAETH_MAINNET_CHAIN_ID]: {
                  chainId: MEGAETH_MAINNET_CHAIN_ID,
                  name: 'MegaETH Mainnet',
                  nativeCurrency: 'MegaETH',
                  blockExplorerUrls: ['https://explorer.com'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'megaeth-mainnet',
                      type: 'custom',
                      url: 'https://rpc.com',
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
              [MEGAETH_MAINNET_CHAIN_ID]: MEGAETH_MAINNET_CLEAN_CONFIG,
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

  it('merges the existing megaeth mainnet network configuration if there is one', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...megaEthMainnetInitialConfiguration,
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
              [MEGAETH_MAINNET_CHAIN_ID]: {
                ...MEGAETH_MAINNET_CLEAN_CONFIG,
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-mainnet',
                    url: 'https://rpc.com',
                    type: 'custom',
                  },
                  {
                    ...MEGAETH_MAINNET_CLEAN_CONFIG.rpcEndpoints[0],
                    networkClientId: 'mock-uuid',
                  },
                ],
                defaultRpcEndpointIndex: 1,
                defaultBlockExplorerUrlIndex: 1,
                blockExplorerUrls: [
                  'https://explorer.com',
                  'https://megaeth.blockscout.com', // No backslash, since was not already present
                ],
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

  it('keeps original RPC if no infura key is found', async () => {
    delete process.env.MM_INFURA_PROJECT_ID;

    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...megaEthMainnetInitialConfiguration,
              [MEGAETH_MAINNET_CHAIN_ID]: {
                ...MEGAETH_MAINNET_CLEAN_CONFIG,
                name: 'MegaETH Mainnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-mainnet',
                    url: 'https://rpc.com',
                    type: 'custom',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://explorer.com'],
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
              [MEGAETH_MAINNET_CHAIN_ID]: {
                ...MEGAETH_MAINNET_CLEAN_CONFIG,
                rpcEndpoints:
                  megaEthMainnetInitialConfiguration[MEGAETH_MAINNET_CHAIN_ID]
                    .rpcEndpoints,
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 1,
                blockExplorerUrls: [
                  'https://explorer.com',
                  'https://megaeth.blockscout.com', // No backslash, since was not already present
                ],
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
          'Infura project ID is not set, skip the MegaETH RPC part of the migration',
        ),
      }),
    );

    expect(migratedState).toStrictEqual(expectedState);
  });

  it('returns the original state if the megaeth mainnet network configuration exists but is invalid', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [MEGAETH_MAINNET_CHAIN_ID]: {
                ...MEGAETH_MAINNET_CLEAN_CONFIG,
                name: 'MegaETH Mainnet',
                nativeCurrency: 'ETH',
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
              [MEGAETH_MAINNET_CHAIN_ID]: {
                ...MEGAETH_MAINNET_CLEAN_CONFIG,
                name: 'MegaETH Mainnet',
                nativeCurrency: 'ETH',
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
