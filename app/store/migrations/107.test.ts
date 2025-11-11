import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './107';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const migrationVersion = 107;
const QUICKNODE_SEI_URL = 'https://failover.com';

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
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      test: 'invalid NetworkController state',
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
      test: 'invalid networkConfigurationsByChainId state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
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
                },
              },
            },
          },
        },
      },
      test: 'SEI network is not found',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x531': {
                  chainId: '0x531',
                  defaultRpcEndpointIndex: 0,
                  blockExplorerUrls: ['https://seitrace.com'],
                  defaultBlockExplorerUrlIndex: 0,
                  name: 'Custom Sei Network',
                  nativeCurrency: 'SEI',
                },
              },
            },
          },
        },
      },
      test: 'rpcEndpoints is not an array in SEI network configuration',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not add failover URL if there is already a failover URL', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
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
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'custom',
                    name: 'Sei Network',
                    failoverUrls: ['https://failover.com'],
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('does not add failover URL if QUICKNODE_SEI_URL env variable is not set', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
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
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'custom',
                    name: 'Sei Network',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('adds QuickNode failover URL to all SEI RPC endpoints when no failover URLs exist', async () => {
    process.env.QUICKNODE_SEI_URL = QUICKNODE_SEI_URL;
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
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
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'custom',
                    name: 'Sei Network',
                  },
                  {
                    networkClientId: 'sei-network-2',
                    url: 'http://some-sei-rpc.com',
                    type: 'custom',
                    name: 'Sei Network',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0x531': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x531'],
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'custom',
                    name: 'Sei Network',
                    failoverUrls: [QUICKNODE_SEI_URL],
                  },
                  {
                    networkClientId: 'sei-network-2',
                    url: 'http://some-sei-rpc.com',
                    type: 'custom',
                    name: 'Sei Network',
                    failoverUrls: [QUICKNODE_SEI_URL],
                  },
                ],
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
