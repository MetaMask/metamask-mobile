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
});
