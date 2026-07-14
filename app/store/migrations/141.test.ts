import migrate from './141';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #141 - Replace zkSync Era Network RPC URL', () => {
  const ZKSYNC_CHAIN_ID = CHAIN_IDS.ZKSYNC_ERA;
  const LINEA_CHAIN_ID = CHAIN_IDS.LINEA_MAINNET;
  const MAINNET_CHAIN_ID = '0x1';
  const SEPOLIA_CHAIN_ID = '0xaa36a7';
  const OLD_RPC_URL = 'https://mainnet.era.zksync.io';
  const NEW_RPC_URL = `https://zksync-mainnet.infura.io/v3/${
    process.env.MM_INFURA_PROJECT_ID === 'null'
      ? ''
      : process.env.MM_INFURA_PROJECT_ID
  }`;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 141: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 141: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 141: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should replace the zkSync Era RPC URL when the user relies on Infura on another chain', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                  { url: 'https://non-infura.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: OLD_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
                nativeCurrency: 'ETH',
                name: 'zkSync Era',
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: NEW_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(expectedState);
  });

  it('should do nothing if the zkSync Era network configuration is missing', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should do nothing if the zkSync Era RPC URL is not the legacy URL', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://custom.zksync.rpc' },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should handle cases where rpcEndpoints is not an array', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: null,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should do nothing if no networks use Infura RPC endpoints', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://non-infura.rpc' },
                  { url: 'https://another-non-infura.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [{ url: OLD_RPC_URL }],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should exclude LINEA_MAINNET from Infura RPC endpoint checks', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [LINEA_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://linea-mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [{ url: OLD_RPC_URL }],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should exclude ZKSYNC_ERA itself from Infura RPC endpoint checks', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://zksync-mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should exclude testnets (e.g. Sepolia) from Infura RPC endpoint checks', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [SEPOLIA_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://sepolia.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [{ url: OLD_RPC_URL }],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should preserve other endpoint and network fields when rewriting the URL', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [MAINNET_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [ZKSYNC_CHAIN_ID]: {
                chainId: ZKSYNC_CHAIN_ID,
                name: 'zkSync Era',
                nativeCurrency: 'ETH',
                blockExplorerUrls: ['https://explorer.zksync.io/'],
                defaultBlockExplorerUrlIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://custom.zksync.rpc',
                    networkClientId: 'custom-id',
                    type: 'custom',
                  },
                  {
                    url: OLD_RPC_URL,
                    networkClientId: 'zksync-id',
                    type: 'custom',
                    failoverUrls: ['https://failover.zksync.rpc'],
                  },
                ],
                defaultRpcEndpointIndex: 1,
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [ZKSYNC_CHAIN_ID]: {
                rpcEndpoints: [
                  {
                    url: 'https://custom.zksync.rpc',
                    networkClientId: 'custom-id',
                    type: 'custom',
                  },
                  {
                    url: NEW_RPC_URL,
                    networkClientId: 'zksync-id',
                    type: 'custom',
                    failoverUrls: ['https://failover.zksync.rpc'],
                  },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(expectedState);
  });
});
