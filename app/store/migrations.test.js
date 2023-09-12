import { cloneDeep } from 'lodash';
import { v4 } from 'uuid';
import { migrations, version } from './migrations';
import initialBackgroundState from '../util/test/initial-background-state.json';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../app/constants/network';

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');

  return {
    ...actual,
    v4: jest.fn(),
  };
});

describe('Redux Persist Migrations', () => {
  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });

  it('should apply last migration version and return state', () => {
    // update this state to be compatible with the most recent migration
    const oldState = {
      engine: {
        backgroundState: initialBackgroundState,
      },
    };

    const migration = migrations[version];

    const newState = migration(oldState);

    expect(newState).toBeDefined();
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

      const migration = migrations[22];
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
});
