import migration from './027';

describe('Migration #27', () => {
  it('does nothing if no transaction controller state', () => {
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
