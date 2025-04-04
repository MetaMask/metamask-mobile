import migrate from './020';
import { v4 } from 'uuid';

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');

  return {
    ...actual,
    v4: jest.fn(),
  };
});

describe('Migration #20', () => {
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

    const newState = migrate(oldState);

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

    const newState = migrate(oldState);

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

    const newState = migrate(oldState);

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

    const newState = migrate(oldState);

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

    const newState = migrate(oldState);

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
                rpcUrl: 'https://polygon-mainnet.infura.io/v3/12345',
                ticker: 'MATIC',
              },
              {
                chainId: '10',
                nickname: 'Optimism',
                rpcPrefs: {
                  blockExplorerUrl: 'https://optimistic.etherscan.io',
                },
                rpcUrl: 'https://optimism-mainnet.infura.io/v3/12345',
                ticker: 'ETH',
              },
            ],
          },
        },
      },
    };
    const newState = migrate(oldState);

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
                rpcUrl: 'https://polygon-mainnet.infura.io/v3/12345',
                ticker: 'MATIC',
              },
              networkId3: {
                chainId: '10',
                nickname: 'Optimism',
                rpcPrefs: {
                  blockExplorerUrl: 'https://optimistic.etherscan.io',
                },
                rpcUrl: 'https://optimism-mainnet.infura.io/v3/12345',
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

  it('should convert networkConfigurations to an empty object if frequentRpcList is an empty array', () => {
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
            frequentRpcList: [],
          },
        },
      },
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual({
      foo: 'bar',
      engine: {
        backgroundState: {
          NetworkController: {
            network: 'loading',
            networkConfigurations: {},
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
