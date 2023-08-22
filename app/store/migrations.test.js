import { cloneDeep } from 'lodash';
import { v4 } from 'uuid';
import { migrations, version } from './migrations';
import initialBackgroundState from '../util/test/initial-background-state.json';

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
});
