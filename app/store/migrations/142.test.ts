import { cloneDeep } from 'lodash';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

import { ensureValidState } from './util';
import migrate from './142';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
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
          '0xaa36a7': {
            chainId: '0xaa36a7',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Sepolia',
            nativeCurrency: 'SepoliaETH',
          },
          '0xe705': {
            chainId: '0xe705',
            rpcEndpoints: [
              {
                networkClientId: 'linea-sepolia',
                url: 'https://linea-sepolia.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://sepolia.lineascan.build'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea Sepolia',
            nativeCurrency: 'LineaETH',
          },
          '0xe708': {
            chainId: '0xe708',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.build'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea Mainnet',
            nativeCurrency: 'ETH',
          },
        },
      },
    },
  },
});

const QUICKNODE_MONAD_URL = 'https://failover.quicknode.example/monad';

const createMonadMainnetConfiguration = (
  failoverUrls?: string[],
): NetworkConfiguration => ({
  chainId: '0x8f',
  rpcEndpoints: [
    {
      networkClientId: 'monad-mainnet',
      url: 'https://monad-mainnet.infura.io/v3/{infuraProjectId}',
      type: RpcEndpointType.Infura,
      ...(failoverUrls ? { failoverUrls } : {}),
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://monadscan.com'],
  defaultBlockExplorerUrlIndex: 0,
  name: 'Monad',
  nativeCurrency: 'MON',
});

describe('Migration 142: Add `Monad Mainnet`', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(migratedState).toStrictEqual({ some: 'state' });
  });

  it('adds `Monad Mainnet` as a default Infura network to state without failoverUrls when QUICKNODE_MONAD_URL is not set', () => {
    const monadMainnetConfiguration = createMonadMainnetConfiguration();
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);
    delete process.env.QUICKNODE_MONAD_URL;

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              [monadMainnetConfiguration.chainId]: monadMainnetConfiguration,
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
  });

  it('adds `Monad Mainnet` with failoverUrls when QUICKNODE_MONAD_URL is set', () => {
    const monadMainnetConfiguration = createMonadMainnetConfiguration([
      QUICKNODE_MONAD_URL,
    ]);
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);
    process.env.QUICKNODE_MONAD_URL = QUICKNODE_MONAD_URL;

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              [monadMainnetConfiguration.chainId]: monadMainnetConfiguration,
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);

    delete process.env.QUICKNODE_MONAD_URL;
  });

  it('does not overwrite an existing `Monad Mainnet` NetworkConfiguration', () => {
    const monadMainnetConfiguration = createMonadMainnetConfiguration();
    const oldState = createTestState();
    const networkConfigurationsByChainId = oldState.engine.backgroundState
      .NetworkController.networkConfigurationsByChainId as Record<
      Hex,
      NetworkConfiguration
    >;
    const existingMonadConfiguration: NetworkConfiguration = {
      ...monadMainnetConfiguration,
      name: 'My Custom Monad',
      rpcEndpoints: [
        {
          networkClientId: 'some-client-id',
          url: 'https://some-custom-monad-rpc.example/rpc',
          type: RpcEndpointType.Custom,
        },
      ],
      blockExplorerUrls: ['https://my-custom-explorer.example'],
    };
    networkConfigurationsByChainId[monadMainnetConfiguration.chainId] =
      existingMonadConfiguration;
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              [monadMainnetConfiguration.chainId]: existingMonadConfiguration,
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
  });

  it.each([
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'missing NetworkController',
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
            NetworkController: {},
          },
        },
      },
      test: 'missing networkConfigurationsByChainId',
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
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(orgState);
  });
});
