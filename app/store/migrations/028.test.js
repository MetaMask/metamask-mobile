import migration from './028';

describe('Migration #28', () => {
  it('changing chain id to hexadecimal chain id on network controller provider config', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '1',
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '0x1',
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('changing rpcTarget to rpcUrl on network controller provider config', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              rpcTarget: 'https://api.avax.network/ext/bc/C/rpc',
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('changing networkOnboardedState object key value, that is repesenting chain id on decimal format to hexadecimal format', () => {
    const oldState = {
      networkOnboarded: {
        networkOnboardedState: {
          1: true,
        },
      },
    };
    const expectedNewState = {
      networkOnboarded: {
        networkOnboardedState: {
          '0x1': true,
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });
  it('changing networkOnboardedState, chainId and rpcTarget on the same test', () => {
    const oldState = {
      networkOnboarded: {
        networkOnboardedState: {
          1: true,
        },
      },
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              rpcTarget: 'https://api.avax.network/ext/bc/C/rpc',
              chainId: '1',
            },
          },
        },
      },
    };

    const expectedNewState = {
      networkOnboarded: {
        networkOnboardedState: {
          '0x1': true,
        },
      },
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              chainId: '0x1',
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle networkDetails property change', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkDetails: {
              isEIP1559Compatible: true,
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkDetails: {
              EIPS: {
                1559: true,
              },
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle networkConfigurations chainId property change to hexadecimal', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              network1: {
                chainId: '1',
              },
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              network1: {
                chainId: '0x1',
              },
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle swaps on the state initial state key chain id changed for hexadecimal', () => {
    const oldState = {
      swaps: {
        1: {
          data: 'test',
        },
      },
    };
    const expectedNewState = {
      swaps: {
        '0x1': {
          data: 'test',
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle migration for address book controller, chain id identifier changed for hexadecimal', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              1: {
                '0xaddress1': {
                  address: '0xaddress1',
                  chainId: '1',
                  isEns: false,
                  memo: 't',
                  name: 'test',
                },
                '0xaddress2': {
                  address: '0xaddress2',
                  chainId: '1',
                  isEns: false,
                  memo: 't',
                  name: 'test2',
                },
              },
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              '0x1': {
                '0xaddress1': {
                  address: '0xaddress1',
                  chainId: '0x1',
                  isEns: false,
                  memo: 't',
                  name: 'test',
                },
                '0xaddress2': {
                  address: '0xaddress2',
                  chainId: '0x1',
                  isEns: false,
                  memo: 't',
                  name: 'test2',
                },
              },
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle migration for swaps controller chain cache now is on hexadecimal format', () => {
    const oldState = {
      engine: {
        backgroundState: {
          SwapsController: {
            chainCache: {
              1: 'cacheData',
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          SwapsController: {
            chainCache: {
              '0x1': 'cacheData',
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle migration for NftController allNftContracts chain Id now is on hexadecimal format', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NftController: {
            allNftContracts: {
              '0xaddress1': {
                1: [{ tokenId: '123', address: '0x1234' }],
              },
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NftController: {
            allNftContracts: {
              '0xaddress1': {
                '0x1': [{ tokenId: '123', address: '0x1234' }],
              },
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle migration for NftController allNfts chain Id now is on hexadecimal format', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NftController: {
            allNfts: {
              '0xaddress1': {
                1: [{ tokenId: '123', address: '0x1234' }],
              },
            },
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          NftController: {
            allNfts: {
              '0xaddress1': {
                '0x1': [{ tokenId: '123', address: '0x1234' }],
              },
            },
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should handle migration for Transaction Controller transactions object chain id property to hexadecimal', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                blockNumber: '4916784',
                chainId: '1',
                id: '1',
                networkID: '1',
                status: 'confirmed',
                time: 1702984536000,
                transaction: [{}],
                transactionHash:
                  '0x2cb0946f704c288e7448edb3468ff0e75756cb58e66c3c251bb7cb35e5f1108c',
                verifiedOnBlockchain: true,
              },
            ],
          },
        },
      },
    };
    const expectedNewState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                blockNumber: '4916784',
                chainId: '0x1',
                id: '1',
                networkID: '1',
                status: 'confirmed',
                time: 1702984536000,
                transaction: [{}],
                transactionHash:
                  '0x2cb0946f704c288e7448edb3468ff0e75756cb58e66c3c251bb7cb35e5f1108c',
                verifiedOnBlockchain: true,
              },
            ],
          },
        },
      },
    };

    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });
});
