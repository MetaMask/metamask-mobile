import migrate from './055';
import { captureException } from '@sentry/react-native';
import mockedEngine from '../../core/__mocks__/MockedEngine';
import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { PreferencesState } from '@metamask/preferences-controller';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';

const version = 55;

interface EngineState {
  engine: {
    backgroundState: {
      NetworkController: NetworkState;
      PreferencesController: PreferencesState;
      SelectedNetworkController: SelectedNetworkControllerState;
    };
  };
}

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe(`migration #${version}`, () => {
  afterEach(() => jest.resetAllMocks());

  it('captures an exception if the network controller state is not defined', async () => {
    const oldState = {
      engine: { backgroundState: {} },
    };

    await migrate(oldState);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `FATAL ERROR: Migration ${version}: Invalid NetworkController state error: 'undefined'`,
      ),
    );
  });

  it('captures an exception if the network controller state is not an object', async () => {
    for (const NetworkController of [undefined, null, 1, 'foo']) {
      const oldState = {
        engine: { backgroundState: { NetworkController } },
      };

      await migrate(oldState);
      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `FATAL ERROR: Migration ${version}: Invalid NetworkController state error: '${typeof NetworkController}'`,
        ),
      );
      mockedCaptureException.mockClear();
    }
  });

  it('captures an exception if the transaction controller state is not defined', async () => {
    const oldState = {
      engine: { backgroundState: { NetworkController: {} } },
    };

    await migrate(oldState);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `FATAL ERROR: Migration ${version}: Invalid TransactionController state error: 'undefined'`,
      ),
    );
  });

  it('captures an exception if the transaction controller state is not an object', async () => {
    for (const TransactionController of [undefined, null, 1, 'foo']) {
      const oldState = {
        engine: {
          backgroundState: { NetworkController: {}, TransactionController },
        },
      };

      await migrate(oldState);
      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `FATAL ERROR: Migration ${version}: Invalid TransactionController state error: '${typeof TransactionController}'`,
        ),
      );
      mockedCaptureException.mockClear();
    }
  });

  it('adds built-in Infura networks to the network configurations', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {},
          },
          TransactionController: { transactions: [] },
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;

    const expectedState = defaultPostMigrationState();
    expect(newState.engine.backgroundState.NetworkController).toStrictEqual(
      expectedState,
    );
  });

  it('tie breaks with the globally selected network', async () => {
    const customNetwork = {
      id: 'network-configuration-id',
      chainId: '0x1',
      nickname: 'My Custom Network',
      ticker: 'ETH',
      rpcUrl: 'https://localhost/rpc',
      rpcPrefs: {
        blockExplorerUrl: 'https://localhost/explorer',
      },
    };

    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: customNetwork.id,
            networkConfigurations: {
              [customNetwork.id]: customNetwork,
            },
          },
          TransactionController: { transactions: [] },
        },
      },
    };

    const defaultStateToExpect = defaultPostMigrationState();
    const expectedNetwork = {
      ...defaultStateToExpect.networkConfigurationsByChainId[
        customNetwork.chainId as keyof typeof defaultStateToExpect.networkConfigurationsByChainId
      ],
    };

    expectedNetwork.defaultRpcEndpointIndex =
      expectedNetwork.rpcEndpoints.push({
        networkClientId: customNetwork.id,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        name: customNetwork.nickname,
        url: customNetwork.rpcUrl,
        type: 'custom',
      }) - 1;

    expectedNetwork.defaultBlockExplorerUrlIndex =
      expectedNetwork.blockExplorerUrls.push(
        customNetwork.rpcPrefs.blockExplorerUrl,
      ) - 1;

    const expectedState = {
      ...defaultStateToExpect,
      selectedNetworkClientId: customNetwork.id,
      networkConfigurationsByChainId: {
        ...defaultStateToExpect.networkConfigurationsByChainId,
        [customNetwork.chainId]: expectedNetwork,
      },
    };

    const newState = (await migrate(oldState)) as EngineState;
    expect(newState.engine.backgroundState.NetworkController).toStrictEqual(
      expectedState,
    );
  });

  it('tie breaks with the most recently transacted network', async () => {
    const customNetwork = {
      id: 'network-configuration-id',
      chainId: '0x1',
      nickname: 'My Local Node',
      ticker: 'ETH',
      rpcUrl: 'https://localhost/rpc',
      rpcPrefs: {
        blockExplorerUrl: 'https://localhost/explorer',
      },
    };

    const oldState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                chainId: customNetwork.chainId,
                time: 1,
                networkClientId: 'mainnet',
              },
              {
                chainId: customNetwork.chainId,
                time: 2,
                networkClientId: customNetwork.id,
              },
            ],
          },
          NetworkController: {
            selectedNetworkClientId: 'sepolia',
            networkConfigurations: {
              [customNetwork.id]: customNetwork,
            },
          },
        },
      },
    };

    const defaultStateToExpect = defaultPostMigrationState() as NetworkState;

    const expectedNetwork = {
      ...defaultStateToExpect.networkConfigurationsByChainId[
        customNetwork.chainId as `0x${string}`
      ],
    };

    // The custom network's rpc url should be added to the
    // existing network, and become the default RPC url
    expectedNetwork.defaultRpcEndpointIndex =
      expectedNetwork.rpcEndpoints.push({
        networkClientId: customNetwork.id,
        name: customNetwork.nickname,
        url: customNetwork.rpcUrl,
        type: RpcEndpointType.Custom,
      }) - 1;

    // The custom network's block explorer should be added to
    // the existing network, and it should become the default.
    expectedNetwork.defaultBlockExplorerUrlIndex =
      expectedNetwork.blockExplorerUrls.push(
        customNetwork.rpcPrefs.blockExplorerUrl,
      ) - 1;

    const expectedState = {
      ...defaultStateToExpect,
      // Selected network shouldn't change
      selectedNetworkClientId:
        oldState.engine.backgroundState.NetworkController
          .selectedNetworkClientId,
      networkConfigurationsByChainId: {
        ...defaultStateToExpect.networkConfigurationsByChainId,
        [customNetwork.chainId]: expectedNetwork,
      },
    };

    const newState = (await migrate(oldState)) as EngineState;
    expect(newState.engine.backgroundState.NetworkController).toStrictEqual(
      expectedState,
    );
  });

  it('dedupes multiple block explorers within a chain id', async () => {
    const randomChainId = '0x123456';

    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              'network-id-1': {
                id: 'network-id-1',
                chainId: randomChainId,
                nickname: 'Test Network',
                ticker: 'FOO',
                rpcUrl: 'https://localhost/rpc/1',
                rpcPrefs: {
                  blockExplorerUrl: 'https://localhost/explorer',
                },
              },
              'network-id-2': {
                id: 'network-id-2',
                chainId: randomChainId,
                nickname: 'Test Network',
                ticker: 'FOO',
                rpcUrl: 'https://localhost/rpc/2',
                rpcPrefs: {
                  blockExplorerUrl: 'https://localhost/explorer',
                },
              },
            },
          },
          TransactionController: {},
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;

    const { networkConfigurationsByChainId } = newState.engine.backgroundState
      .NetworkController as {
      networkConfigurationsByChainId: Record<
        string,
        { defaultBlockExplorerUrlIndex: number; blockExplorerUrls: string[] }
      >;
    };

    const networkConfiguration = networkConfigurationsByChainId[randomChainId];
    expect(networkConfiguration.defaultBlockExplorerUrlIndex).toStrictEqual(0);
    expect(networkConfiguration.blockExplorerUrls).toStrictEqual([
      'https://localhost/explorer',
    ]);
  });

  it('handles invalid RPC URLs by omitting them', async () => {
    const randomChainId = '0x123456';

    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              'network-id-1': {
                id: 'network-id-1',
                chainId: randomChainId,
                nickname: 'Test Network',
                ticker: 'FOO',
                rpcUrl: 'not_a_valid_url',
              },
            },
          },
          TransactionController: {},
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;

    // Expect the configuration with an invalid URL to be omitted
    expect(newState.engine.backgroundState.NetworkController).toStrictEqual(
      defaultPostMigrationState(),
    );
  });

  it('handles the case where selectedNetworkClientId does not point to any endpoint', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'nonexistent-client-id',
          },
          TransactionController: {},
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;

    // selectedNetworkClientId should fall back to mainnet
    expect(newState.engine.backgroundState.NetworkController).toStrictEqual(
      defaultPostMigrationState(),
    );
  });

  it('sets `showMultiRpcModal` to true when there are networks with multiple endpoints', async () => {
    const randomChainId = '0x123456';

    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              'network-id-1': {
                id: 'network-id-1',
                chainId: randomChainId,
                nickname: 'Test Network',
                ticker: 'FOO',
                rpcUrl: 'https://localhost/rpc/1',
              },
              'network-id-2': {
                id: 'network-id-2',
                chainId: randomChainId,
                nickname: 'Test Network',
                ticker: 'FOO',
                rpcUrl: 'https://localhost/rpc/2',
              },
            },
          },
          TransactionController: {},
          PreferencesController: { preferences: {} },
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;
    expect(newState.engine.backgroundState.PreferencesController).toStrictEqual(
      {
        preferences: {},
        showMultiRpcModal: true,
      },
    );
  });

  it('updates the selected network controller to remove stale network client ids', async () => {
    const randomChainId = '0x123456';
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              'normal-network-id': {
                id: 'normal-network-id',
                chainId: randomChainId,
                nickname: 'Normal Network',
                ticker: 'TICK',
                rpcUrl: 'https://localhost/rpc',
              },
            },
          },
          SelectedNetworkController: {
            domains: {
              // I should stay in the selected network controller
              'normal.com': 'normal-network-id',
              // I should be removed, as I never pointed to a network
              'neverexisted.com': 'never-existed-network-id',
            },
          },
          TransactionController: {},
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;
    expect(
      newState.engine.backgroundState.SelectedNetworkController,
    ).toStrictEqual({
      domains: { 'normal.com': 'normal-network-id' },
    });
  });

  it('updates the selected network controller to point domains to the default RPC endpoint', async () => {
    const untouchedChainId = '0x123';
    const redirectedChainId = '0x456';
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'already-default-network-id',
            networkConfigurations: {
              'untouched-network-id': {
                id: 'untouched-network-id',
                chainId: untouchedChainId,
                nickname: 'Untouched Network',
                ticker: 'TICK',
                rpcUrl: 'https://localhost/rpc/1',
              },
              'already-default-network-id': {
                id: 'already-default-network-id',
                chainId: redirectedChainId,
                nickname: 'Default Network',
                ticker: 'TICK',
                rpcUrl: 'https://localhost/rpc/2',
              },
              'redirected-network-id': {
                id: 'redirected-network-id',
                chainId: redirectedChainId,
                nickname: 'Redirected Network',
                ticker: 'TICK',
                rpcUrl: 'https://localhost/rpc/3',
              },
            },
          },
          SelectedNetworkController: {
            domains: {
              'untouched.com': 'untouched-network-id',
              'already-default.com': 'already-default-network-id',
              'redirected.com': 'redirected-network-id',
              // Test the case where it pointed to a built in
              // network, which would not have been in state before
              'mainnet.com': 'mainnet',
            },
          },
          TransactionController: {},
        },
      },
    };

    const newState = (await migrate(oldState)) as EngineState;
    expect(
      newState.engine.backgroundState.SelectedNetworkController,
    ).toStrictEqual({
      domains: {
        'untouched.com': 'untouched-network-id',
        'already-default.com': 'already-default-network-id',
        'redirected.com': 'already-default-network-id',
        'mainnet.com': 'mainnet',
      },
    });
  });
});

// The state of the network controller post migration for just the
// built-in networks. As if there were no custom networks defined.
function defaultPostMigrationState() {
  const state = {
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
  };

  return state;
}
