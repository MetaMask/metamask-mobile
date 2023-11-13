import { cloneDeep, merge } from 'lodash';
import { v4 } from 'uuid';
import { migrations, version } from './migrations';
import initialBackgroundState from '../util/test/initial-background-state.json';
import initialRootState from '../util/test/initial-root-state';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../app/constants/network';
import { captureException } from '@sentry/react-native';

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');

  return {
    ...actual,
    v4: jest.fn(),
  };
});

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);

describe('Redux Persist Migrations', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });

  it('should apply last migration version and return state', () => {
    // update this state to be compatible with the most recent migration
    const oldState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [],
          },
        },
      },
    };

    const migration = migrations[version];
    const newState = migration(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [],
            submitHistory: [],
          },
        },
      },
    });
  });

  describe('#19', () => {
    it('should not change state if recents are missing', () => {
      const oldState = {
        foo: 'bar',
      };

      const migration = migrations[19];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should remove recents', () => {
      const oldState = {
        recents: '0x1',
      };

      const migration = migrations[19];

      const newState = migration(oldState);

      expect(newState).toStrictEqual({});
    });
  });

  describe('#20', () => {
    it('should return state unaltered if there is no preferences controller state', () => {
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            OtherController: {
              foo: 'bar',
            },
            NetworkController: {
              network: 'loading',
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should return state unaltered if there is no network controller state', () => {
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              frequentRpcList: [],
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should return state unaltered if there is no frequent RPC list state', () => {
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should return state unaltered if there is no frequent RPC list is empty', () => {
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
              frequentRpcList: [],
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should convert chain ID to decimal string', () => {
      v4.mockImplementationOnce(() => 'networkId1');
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
              frequentRpcList: [
                {
                  chainId: 43114,
                  nickname: 'Avalanche Mainnet C-Chain',
                  rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
                  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                  ticker: 'AVAX',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual({
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
              networkConfigurations: {
                networkId1: {
                  chainId: '43114',
                  nickname: 'Avalanche Mainnet C-Chain',
                  rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
                  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                  ticker: 'AVAX',
                },
              },
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
            },
          },
        },
      });
    });

    it('should migrate multiple network configurations to network controller', () => {
      v4.mockImplementationOnce(() => 'networkId1')
        .mockImplementationOnce(() => 'networkId2')
        .mockImplementationOnce(() => 'networkId3');
      const oldState = {
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
              frequentRpcList: [
                {
                  chainId: '43114',
                  nickname: 'Avalanche Mainnet C-Chain',
                  rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
                  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                  ticker: 'AVAX',
                },
                {
                  chainId: '137',
                  nickname: 'Polygon Mainnet',
                  rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                  rpcUrl:
                    'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                  ticker: 'MATIC',
                },
                {
                  chainId: '10',
                  nickname: 'Optimism',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://optimistic.etherscan.io',
                  },
                  rpcUrl:
                    'https://optimism-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                  ticker: 'ETH',
                },
              ],
            },
          },
        },
      };
      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual({
        foo: 'bar',
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
              networkConfigurations: {
                networkId1: {
                  chainId: '43114',
                  nickname: 'Avalanche Mainnet C-Chain',
                  rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
                  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                  ticker: 'AVAX',
                },
                networkId2: {
                  chainId: '137',
                  nickname: 'Polygon Mainnet',
                  rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                  rpcUrl:
                    'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                  ticker: 'MATIC',
                },
                networkId3: {
                  chainId: '10',
                  nickname: 'Optimism',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://optimistic.etherscan.io',
                  },
                  rpcUrl:
                    'https://optimism-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                  ticker: 'ETH',
                },
              },
            },
            OtherController: {
              foo: 'bar',
            },
            PreferencesController: {
              foo: 'bar',
            },
          },
        },
      });
    });
  });

  describe('#21', () => {
    it('should not change state if ipfs gateway in use is not outdated', () => {
      const currentState = {
        engine: {
          backgroundState: initialBackgroundState,
        },
      };

      const migration = migrations[21];

      const newState = migration(currentState);

      expect(newState).toStrictEqual(currentState);
    });

    it('should change outdated ipfs gateway to default one', () => {
      const stateWithIpfsGateway = (ipfsGateway) => ({
        engine: {
          backgroundState: {
            ...initialBackgroundState,
            PreferencesController: {
              ...initialBackgroundState.PreferencesController,
              ipfsGateway,
            },
          },
        },
      });

      // State with outdated ipfs gateway
      const currentState = stateWithIpfsGateway('https://hardbin.com/ipfs/');

      // State with default ipfs gateway
      const newStateExpectation = stateWithIpfsGateway(
        IPFS_DEFAULT_GATEWAY_URL,
      );

      const migration = migrations[21];
      const newState = migration(currentState);
      expect(newState).toStrictEqual(newStateExpectation);
    });

    it('should return same state if state objects are undefined', () => {
      const stateWithoutPreferencesController = {
        engine: {
          backgroundState: {},
        },
      };

      const migration = migrations[21];
      const newState = migration(stateWithoutPreferencesController);

      expect(newState).toStrictEqual(stateWithoutPreferencesController);
    });
  });

  describe('#22', () => {
    it('should DisplayNftMedia have the same value as openSeaEnabled and delete openSeaEnabled property and delete nftDetectionDismissed', () => {
      const oldState = {
        user: { nftDetectionDismissed: true },
        engine: {
          backgroundState: { PreferencesController: { openSeaEnabled: true } },
        },
      };

      const migration = migrations[22];

      const newState = migration(oldState);

      expect(newState).toStrictEqual({
        user: {},
        engine: {
          backgroundState: { PreferencesController: { displayNftMedia: true } },
        },
      });
    });
  });

  describe('#23', () => {
    const invalidBackgroundStates = [
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              NetworkController: null,
            },
          },
        }),
        errorMessage:
          "Migration 23: Invalid network controller state: 'object'",
        scenario: 'network controller state is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              NetworkController: { networkConfigurations: null },
            },
          },
        }),
        errorMessage:
          "Migration 23: Invalid network configuration state: 'object'",
        scenario: 'network configuration state is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              NetworkController: {
                networkConfigurations: { mockNetworkConfigurationId: {} },
              },
            },
          },
        }),
        errorMessage:
          "Migration 23: Network configuration missing chain ID, id 'mockNetworkConfigurationId', keys ''",
        scenario: 'network configuration has entry missing chain ID',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              AddressBookController: null,
            },
          },
        }),
        errorMessage:
          "Migration 23: Invalid address book controller state: 'object'",
        scenario: 'address book controller state is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              AddressBookController: { addressBook: null },
            },
          },
        }),
        errorMessage: "Migration 23: Invalid address book state: 'object'",
        scenario: 'address book state is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              AddressBookController: { addressBook: { 1337: null } },
            },
          },
        }),
        errorMessage:
          "Migration 23: Address book configuration invalid, network id '1337', type 'object'",
        scenario: 'address book network entry is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              AddressBookController: {
                addressBook: {
                  1337: { '0x0000000000000000000000000000000000000001': {} },
                },
              },
            },
          },
        }),
        errorMessage:
          "Migration 23: Address book configuration entry missing chain ID, network id '1337', keys ''",
        scenario: 'address book entry missing chain ID',
      },
      {
        state: merge({}, initialRootState, {
          user: null,
        }),
        errorMessage: "Migration 23: Invalid user state: 'object'",
        scenario: 'user state is invalid',
      },
    ];

    for (const { errorMessage, scenario, state } of invalidBackgroundStates) {
      it(`should capture exception if ${scenario}`, () => {
        const migration = migrations[23];
        const newState = migration(cloneDeep(state));

        expect(newState).toStrictEqual(state);
        expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
        expect(mockedCaptureException.mock.calls[0][0].message).toBe(
          errorMessage,
        );
      });
    }

    it('should not change state if address book is empty', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: { addressBook: {} },
          },
        },
      });

      const migration = migrations[22];
      const newState = migration(cloneDeep(state));

      expect(newState).toStrictEqual(state);
    });

    it('should not change state if there are no ambiguous network IDs', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: {
              addressBook: {
                11155111: {
                  '0x0000000000000000000000000000000000000001': {
                    address: '0x0000000000000000000000000000000000000001',
                    name: 'Mock',
                    chainId: '11155111',
                    memo: '',
                    isEns: false,
                  },
                },
              },
            },
          },
        },
      });

      const migration = migrations[23];
      const newState = migration(cloneDeep(state));

      expect(newState).toStrictEqual(state);
    });

    it('should migrate ambiguous network IDs based on available networks configured locally', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: {
              addressBook: {
                // This is an ambiguous built-in network (other chains share this network ID)
                1: {
                  '0x0000000000000000000000000000000000000001': {
                    address: '0x0000000000000000000000000000000000000001',
                    name: 'Mock1',
                    chainId: '1',
                    memo: '',
                    isEns: false,
                  },
                },
                // This is an ambiguous custom network (other chains share this network ID)
                10: {
                  '0x0000000000000000000000000000000000000002': {
                    address: '0x0000000000000000000000000000000000000002',
                    name: 'Mock2',
                    chainId: '10',
                    memo: '',
                    isEns: false,
                  },
                },
              },
            },
            NetworkController: {
              networkConfigurations: {
                mockNetworkConfigurationId: {
                  id: 'mockNetworkConfigurationId',
                  rpcUrl: 'https://fake-url.metamask.io',
                  // 2415 is the chain ID for a network with the network ID "10"
                  chainId: '2415',
                  ticker: 'ETH',
                },
              },
            },
          },
        },
      });

      const migration = migrations[23];
      const newState = migration(cloneDeep(state));

      expect(newState.user).toStrictEqual({});
      expect(newState.engine.backgroundState).toStrictEqual(
        merge({}, initialBackgroundState, {
          AddressBookController: {
            addressBook: {
              // This is unchanged because the only configured network with a network ID 1 also has
              // a chain ID of 1.
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // This has been updated from 10 to 2415 according to the one configured local network
              // with a network ID of 2415
              2415: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '2415',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
          NetworkController: state.engine.backgroundState.NetworkController,
        }),
      );
    });

    it('should duplicate entries where multiple configured networks match network ID', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: {
              addressBook: {
                // This is an ambiguous built-in network (other chains share this network ID)
                1: {
                  '0x0000000000000000000000000000000000000001': {
                    address: '0x0000000000000000000000000000000000000001',
                    name: 'Mock1',
                    chainId: '1',
                    memo: '',
                    isEns: false,
                  },
                },
                // This is an ambiguous custom network (other chains share this network ID)
                10: {
                  '0x0000000000000000000000000000000000000002': {
                    address: '0x0000000000000000000000000000000000000002',
                    name: 'Mock2',
                    chainId: '10',
                    memo: '',
                    isEns: false,
                  },
                },
              },
            },
            NetworkController: {
              networkConfigurations: {
                mockNetworkConfigurationId1: {
                  id: 'mockNetworkConfigurationId1',
                  rpcUrl: 'https://fake-url1.metamask.io',
                  // 10 is the chain ID for a network with the network ID "10"
                  chainId: '10',
                  ticker: 'ETH',
                },
                mockNetworkConfigurationId2: {
                  id: 'mockNetworkConfigurationId2',
                  rpcUrl: 'https://fake-url2.metamask.io',
                  // 2415 is the chain ID for a network with the network ID "10"
                  chainId: '2415',
                  ticker: 'ETH',
                },
              },
            },
          },
        },
      });

      const migration = migrations[23];
      const newState = migration(cloneDeep(state));

      expect(newState.user).toStrictEqual({
        ambiguousAddressEntries: {
          10: ['0x0000000000000000000000000000000000000002'],
          2415: ['0x0000000000000000000000000000000000000002'],
        },
      });
      expect(newState.engine.backgroundState).toStrictEqual(
        merge({}, initialBackgroundState, {
          AddressBookController: {
            addressBook: {
              // This is unchanged because the only configured network with a network ID 1 also has
              // a chain ID of 1.
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // The entry for 10 has been duplicated across both locally configured networks that
              // have a matching network ID: 10 and 2415
              10: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '10',
                  memo: '',
                  isEns: false,
                },
              },
              2415: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '2415',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
          NetworkController: state.engine.backgroundState.NetworkController,
        }),
      );
    });

    it('should discard address book entries that do not match any configured networks', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: {
              addressBook: {
                // This is an ambiguous built-in network (other chains share this network ID)
                1: {
                  '0x0000000000000000000000000000000000000001': {
                    address: '0x0000000000000000000000000000000000000001',
                    name: 'Mock1',
                    chainId: '1',
                    memo: '',
                    isEns: false,
                  },
                },
                // This is an ambiguous custom network (other chains share this network ID)
                10: {
                  '0x0000000000000000000000000000000000000002': {
                    address: '0x0000000000000000000000000000000000000002',
                    name: 'Mock2',
                    chainId: '10',
                    memo: '',
                    isEns: false,
                  },
                },
              },
            },
            NetworkController: {
              networkConfigurations: {},
            },
          },
        },
      });

      const migration = migrations[23];
      const newState = migration(cloneDeep(state));

      expect(newState.user).toStrictEqual({});
      expect(newState.engine.backgroundState).toStrictEqual(
        merge({}, initialBackgroundState, {
          AddressBookController: {
            addressBook: {
              // This is unchanged because the only configured network with a network ID 1 also has
              // a chain ID of 1.
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // The entry for 10 has been removed because it had no local matches
            },
          },
        }),
      );
    });
  });

  describe('#24', () => {
    const invalidBackgroundStates = [
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              NetworkController: null,
            },
          },
        }),
        errorMessage:
          "Migration 24: Invalid network controller state: 'object'",
        scenario: 'network controller state is invalid',
      },
      {
        state: merge({}, initialRootState, {
          engine: {
            backgroundState: {
              NetworkController: { network: null },
            },
          },
        }),
        errorMessage: "Migration 24: Invalid network state: 'object'",
        scenario: 'network state is invalid',
      },
    ];

    for (const { errorMessage, scenario, state } of invalidBackgroundStates) {
      it(`should capture exception if ${scenario}`, () => {
        const migration = migrations[24];
        const newState = migration(cloneDeep(state));

        expect(newState).toStrictEqual(state);
        expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
        expect(mockedCaptureException.mock.calls[0][0].message).toBe(
          errorMessage,
        );
      });
    }

    it('should migrate loading network state', () => {
      const state = {
        engine: {
          backgroundState: merge({}, initialBackgroundState, {
            NetworkController: {
              network: 'loading',
            },
          }),
        },
      };

      const migration = migrations[24];
      const newState = migration(state);

      expect(newState.engine.backgroundState.NetworkController).toStrictEqual({
        networkConfigurations: {},
        networkDetails: {
          isEIP1559Compatible: false,
        },
        networkId: null,
        networkStatus: 'unknown',
        providerConfig: {
          chainId: '1',
          type: 'mainnet',
        },
      });
    });

    it('should migrate non-loading network state', () => {
      const state = {
        engine: {
          backgroundState: merge({}, initialBackgroundState, {
            NetworkController: {
              network: '1',
            },
          }),
        },
      };

      const migration = migrations[24];
      const newState = migration(state);

      expect(newState.engine.backgroundState.NetworkController).toStrictEqual({
        networkConfigurations: {},
        networkDetails: {
          isEIP1559Compatible: false,
        },
        networkId: '1',
        networkStatus: 'available',
        providerConfig: {
          chainId: '1',
          type: 'mainnet',
        },
      });
    });
  });
  describe('#25', () => {
    it('migrates state from thirdPartyMode to the new incoming transactions networks on preferences controller', () => {
      const oldState = {
        privacy: { thirdPartyApiMode: false },
        engine: {
          backgroundState: {
            PreferencesController: {
              showIncomingTransactions: {
                '0x1': true,
                '0x5': true,
                '0x38': true,
                '0x61': true,
                '0xa': true,
                '0xa869': true,
                '0x1a4': true,
                '0x89': true,
                '0x13881': true,
                '0xa86a': true,
                '0xfa': true,
                '0xfa2': true,
                '0xaa36a7': true,
                '0xe704': true,
                '0xe708': true,
                '0x504': true,
                '0x507': true,
                '0x505': true,
                '0x64': true,
              },
            },
          },
        },
      };

      const migration = migrations[25];

      const newState = migration(oldState);
      expect(newState).toStrictEqual({
        privacy: {},
        engine: {
          backgroundState: {
            PreferencesController: {
              showIncomingTransactions: {
                '0x1': false,
                '0x5': false,
                '0x38': false,
                '0x61': false,
                '0xa': false,
                '0xa869': false,
                '0x1a4': false,
                '0x89': false,
                '0x13881': false,
                '0xa86a': false,
                '0xfa': false,
                '0xfa2': false,
                '0xaa36a7': false,
                '0xe704': false,
                '0xe708': false,
                '0x504': false,
                '0x507': false,
                '0x505': false,
                '0x64': false,
              },
            },
          },
        },
      });
    });
  });

  describe('#26', () => {
    it('delete list state property of phishing controller if it exists', () => {
      const oldState = {
        engine: {
          backgroundState: {
            PhishingController: {
              listState: {},
            },
          },
        },
      };

      const migration = migrations[26];
      const newState = migration(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PhishingController: {},
          },
        },
      });
    });
    it('hotlist and stale list last fetched is resetted to 0', () => {
      const oldState = {
        engine: {
          backgroundState: {
            PhishingController: {
              listState: {},
              hotlistLastFetched: 1,
              stalelistLastFetched: 1,
            },
          },
        },
      };

      const migration = migrations[26];
      const newState = migration(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PhishingController: {
              hotlistLastFetched: 0,
              stalelistLastFetched: 0,
            },
          },
        },
      });
    });

    it('capture exception if phishing controller state is invalid', () => {
      const oldState = {
        engine: {
          backgroundState: {
            PhishingController: {},
          },
        },
      };
      const migration = migrations[26];
      const newState = migration(oldState);
      expect(newState).toStrictEqual(oldState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        `Migration 26: Invalid PhishingControllerState controller state: '${JSON.stringify(
          oldState.engine.backgroundState.PhishingController,
        )}'`,
      );
    });
  });

  describe('#27', () => {
    it('returns only state if no transaction controller state', () => {
      const oldState = {
        engine: {
          backgroundState: {
            OtherController: {
              exampleState: {
                testProperty: 'testValue',
              },
            },
          },
        },
      };

      const migration = migrations[27];
      const newState = migration(oldState);

      expect(newState).toStrictEqual(oldState);
    });

    it('sets empty submit history if no transactions', () => {
      const oldState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
            },
          },
        },
      };

      const migration = migrations[27];
      const newState = migration(oldState);

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
              submitHistory: [],
            },
          },
        },
      });
    });

    it('populates submit history using transactions', () => {
      const oldState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  chainId: '5',
                  id: '1',
                  origin: 'test.com',
                  status: 'confirmed',
                  time: 1631714312,
                  transaction: {
                    from: '0x1',
                  },
                  transactionHash: '0x2',
                  rawTransaction: '0x3',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[27];
      const newState = migration(oldState);

      expect(
        newState.engine.backgroundState.TransactionController.submitHistory,
      ).toStrictEqual([
        {
          chainId: '5',
          hash: '0x2',
          migration: true,
          networkType: undefined,
          networkUrl: [],
          origin: 'test.com',
          rawTransaction: '0x3',
          time: 1631714312,
          transaction: {
            from: '0x1',
          },
        },
      ]);
    });

    it('ignores transactions with no raw transaction', () => {
      const oldState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  chainId: '5',
                  id: '1',
                  origin: 'test.com',
                  status: 'confirmed',
                  time: 1631714312,
                  transaction: {
                    from: '0x1',
                  },
                  transactionHash: '0x2',
                  rawTransaction: '0x3',
                },
                {
                  chainId: '5',
                  id: '2',
                  origin: 'test.com',
                  status: 'confirmed',
                  time: 1631714312,
                  transaction: {
                    from: '0x1',
                  },
                  transactionHash: '0x2',
                },
                {
                  chainId: '1',
                  id: '3',
                  origin: 'test2.com',
                  status: 'submitted',
                  time: 1631714313,
                  transaction: {
                    from: '0x6',
                  },
                  transactionHash: '0x4',
                  rawTransaction: '0x5',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[27];
      const newState = migration(oldState);

      expect(
        newState.engine.backgroundState.TransactionController.submitHistory,
      ).toStrictEqual([
        {
          chainId: '5',
          hash: '0x2',
          migration: true,
          networkType: undefined,
          networkUrl: [],
          origin: 'test.com',
          rawTransaction: '0x3',
          time: 1631714312,
          transaction: {
            from: '0x1',
          },
        },
        {
          chainId: '1',
          hash: '0x4',
          migration: true,
          networkType: undefined,
          networkUrl: [],
          origin: 'test2.com',
          rawTransaction: '0x5',
          time: 1631714313,
          transaction: {
            from: '0x6',
          },
        },
      ]);
    });

    it('sets network type and url using provider config and network configurations', () => {
      const oldState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '5',
                type: 'goerli',
              },
              networkConfigurations: {
                '1-2-3': {
                  chainId: '5',
                  rpcUrl: 'http://goerli.test.com',
                },
                '2-3-4': {
                  chainId: '5',
                  rpcUrl: 'http://goerli.test2.com',
                },
                '3-4-5': {
                  chainId: '1',
                  rpcUrl: 'http://mainnet.test.com',
                },
              },
            },
            TransactionController: {
              transactions: [
                {
                  chainId: '5',
                  id: '1',
                  origin: 'test.com',
                  status: 'confirmed',
                  time: 1631714312,
                  transaction: {
                    from: '0x1',
                  },
                  transactionHash: '0x2',
                  rawTransaction: '0x3',
                },
                {
                  chainId: '1',
                  id: '2',
                  origin: 'test2.com',
                  status: 'confirmed',
                  time: 1631714313,
                  transaction: {
                    from: '0x4',
                  },
                  transactionHash: '0x5',
                  rawTransaction: '0x6',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[27];
      const newState = migration(oldState);

      expect(
        newState.engine.backgroundState.TransactionController.submitHistory,
      ).toStrictEqual([
        {
          chainId: '5',
          hash: '0x2',
          migration: true,
          networkType: 'goerli',
          networkUrl: ['http://goerli.test.com', 'http://goerli.test2.com'],
          origin: 'test.com',
          rawTransaction: '0x3',
          time: 1631714312,
          transaction: {
            from: '0x1',
          },
        },
        {
          chainId: '1',
          hash: '0x5',
          migration: true,
          networkType: 'rpc',
          networkUrl: ['http://mainnet.test.com'],
          origin: 'test2.com',
          rawTransaction: '0x6',
          time: 1631714313,
          transaction: {
            from: '0x4',
          },
        },
      ]);
    });
  });
});
