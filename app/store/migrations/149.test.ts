import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import migrate from './149';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.spyOn(
  jest.requireActual('./util'),
  'ensureValidState',
);

const migrationVersion = 149;
const zkSyncEraChainId = '0x144';
const QUICKNODE_ZKSYNC_URL = 'https://failover.com';

const buildState = (zkSyncFailoverUrls?: string[]) => ({
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
          [zkSyncEraChainId]: {
            chainId: zkSyncEraChainId,
            rpcEndpoints: [
              {
                networkClientId: 'zksync-network',
                url: 'https://zksync-mainnet.infura.io/v3/{infuraProjectId}',
                type: 'custom',
                name: 'zkSync Era',
                ...(zkSyncFailoverUrls
                  ? { failoverUrls: zkSyncFailoverUrls }
                  : {}),
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://explorer.zksync.io/'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'zkSync Era',
            nativeCurrency: 'ETH',
          },
        },
      },
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

    expect(migrate(state)).toStrictEqual({ some: 'state' });
  });

  it('does not modify state and does not capture exception if zkSync Era network is not found', () => {
    const state = {
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
    };
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    expect(migrate(state)).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not add failover URL if there is already a failover URL', () => {
    const oldState = buildState(['https://existing-failover.com']);
    const orgState = cloneDeep(oldState);
    mockedEnsureValidState.mockReturnValue(true);

    expect(migrate(oldState)).toStrictEqual(orgState);
  });

  it('does not add failover URL if QUICKNODE_ZKSYNC_URL env variable is not set', () => {
    const oldState = buildState();
    const orgState = cloneDeep(oldState);
    mockedEnsureValidState.mockReturnValue(true);

    expect(migrate(oldState)).toStrictEqual(orgState);
  });

  it('adds QuickNode failover URL to the zkSync Era RPC endpoint when no failover URLs exist', () => {
    process.env.QUICKNODE_ZKSYNC_URL = QUICKNODE_ZKSYNC_URL;
    const oldState = buildState();
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState) as typeof oldState;
    const zkSyncConfig =
      migratedState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[zkSyncEraChainId];

    expect(
      (zkSyncConfig.rpcEndpoints[0] as { failoverUrls: string[] }).failoverUrls,
    ).toStrictEqual([QUICKNODE_ZKSYNC_URL]);
  });
});
