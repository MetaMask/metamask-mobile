import migrate from './043';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
// This is a state mock with invalid networkConfigurations, derived from the state logs of an affected user
const oldState = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurations: {
          '92c0e479-6133-4a18-b1bf-fa38f654e293': {
            rpcUrl: 'https://polygon-mainnet.infura.io/v3/12345abcd',
            chainId: '0x89',
            ticker: 'MATIC',
            nickname: 'Polygon Mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://polygonscan.com',
            },
          },
          '8229552c-e0ab-4337-b2c7-c572c2dc5f5a': {
            rpcUrl: 'https://optimism-mainnet.infura.io/v3/12345abcd',
            chainId: '0xa',
            ticker: 'ETH',
            nickname: 'Optimism',
            rpcPrefs: {
              blockExplorerUrl: 'https://optimistic.etherscan.io',
            },
          },
          '97d6b2d3-40e6-4813-aede-461b29ead719': {
            rpcUrl: 'https://forno.celo.org/',
            chainId: '0xa4ec',
            ticker: 'CELO',
            nickname: 'Celo (Mainnet)',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.celo.org/',
            },
          },
          'e2daf1b8-67c2-4de5-bead-fb3bbecfc607': {
            rpcUrl: 'https://rpc.gnosischain.com/',
            chainId: '0x64',
            ticker: 'XDAI',
            nickname: 'Gnosis',
            rpcPrefs: {
              blockExplorerUrl: 'https://gnosisscan.io',
            },
          },
          '581302a2-f713-40fd-9175-e25392b49a6e': {
            rpcUrl: 'https://arbitrum-mainnet.infura.io/v3/12345abcd',
            chainId: '0xa4b1',
            ticker: 'ETH',
            nickname: 'Arbitrum One',
            rpcPrefs: {
              blockExplorerUrl: 'https://arbiscan.io',
            },
          },
          'a90c203e-8e27-415b-94e5-5d7f933d752a': {
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: '0xa86a',
            ticker: 'AVAX',
            nickname: 'Avalanche',
            rpcPrefs: {
              blockExplorerUrl: 'https://snowtrace.io',
            },
          },
          'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
            rpcUrl: 'https://developer-access-mainnet.base.org',
            chainId: '0x2105',
            ticker: 'ETH',
            nickname: 'Base',
            rpcPrefs: {
              blockExplorerUrl: 'https://basescan.org',
            },
          },
          '79377077-52dd-4960-9026-879ba34b0f26': {
            rpcUrl: 'https://zksync2-mainnet.zksync.io',
            chainId: '0x144',
            ticker: 'ETH',
            nickname: 'zkSync Era',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.zksync.io',
            },
          },
          '44bcb458-43bc-4c74-9a6b-3c85aa8e5e55': {
            rpcUrl: 'https://rpc.zora.energy',
            chainId: '0x76adf1',
            ticker: 'ETH',
            nickname: 'Zora',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.zora.energy',
            },
          },
          '5ce58544-8df5-46c2-a7b2-8d79fdd88241': {
            rpcUrl: 'https://sepolia.era.zksync.dev',
            chainId: '0x12c',
            ticker: 'ETH',
            nickname: 'zkSync Sepolia Testnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://sepolia.explorer.zksync.io/',
            },
            id: '5ce58544-8df5-46c2-a7b2-8d79fdd88241',
          },
          'c15d0a4c-ded8-4155-964a-a9613e70c3dc': {
            id: 'c15d0a4c-ded8-4155-964a-a9613e70c3dc',
            rpcUrl: 'https://rpc.degen.tips',
            chainId: '0x27bc86aa',
            ticker: 'DEGEN',
            nickname: 'Degen',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.degen.tips',
            },
          },
          'd73386c9-308f-49c7-a566-a1a513780e8e': {
            id: 'd73386c9-308f-49c7-a566-a1a513780e8e',
            rpcUrl: 'https://bsc-dataseed1.binance.org/',
            chainId: '0x38',
            ticker: 'BNB',
            nickname: 'BNB Smart Chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://bscscan.com',
            },
          },
          '411511b5-6e6c-4e30-8563-d67c4d0126b4': {
            id: '411511b5-6e6c-4e30-8563-d67c4d0126b4',
            rpcUrl: 'https://rpc.ham.fun',
            chainId: '0x13f8',
            ticker: 'ETH',
            nickname: 'Ham',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.ham.fun',
            },
          },
        },
        providerConfig: {
          type: 'rpc',
          ticker: 'ETH',
          chainId: '0x2105',
          rpcPrefs: {
            blockExplorerUrl: 'https://basescan.org',
          },
          rpcUrl: 'https://developer-access-mainnet.base.org',
          nickname: 'Base',
        },
      },
    },
  },
};

const expectedState = {
  engine: {
    backgroundState: {
      NetworkController: {
        selectedNetworkClientId: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
        networkConfigurations: {
          '92c0e479-6133-4a18-b1bf-fa38f654e293': {
            id: '92c0e479-6133-4a18-b1bf-fa38f654e293',
            rpcUrl: 'https://polygon-mainnet.infura.io/v3/12345abcd',
            chainId: '0x89',
            ticker: 'MATIC',
            nickname: 'Polygon Mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://polygonscan.com',
            },
          },
          '8229552c-e0ab-4337-b2c7-c572c2dc5f5a': {
            id: '8229552c-e0ab-4337-b2c7-c572c2dc5f5a',
            rpcUrl: 'https://optimism-mainnet.infura.io/v3/12345abcd',
            chainId: '0xa',
            ticker: 'ETH',
            nickname: 'Optimism',
            rpcPrefs: {
              blockExplorerUrl: 'https://optimistic.etherscan.io',
            },
          },
          '97d6b2d3-40e6-4813-aede-461b29ead719': {
            id: '97d6b2d3-40e6-4813-aede-461b29ead719',
            rpcUrl: 'https://forno.celo.org/',
            chainId: '0xa4ec',
            ticker: 'CELO',
            nickname: 'Celo (Mainnet)',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.celo.org/',
            },
          },
          'e2daf1b8-67c2-4de5-bead-fb3bbecfc607': {
            id: 'e2daf1b8-67c2-4de5-bead-fb3bbecfc607',
            rpcUrl: 'https://rpc.gnosischain.com/',
            chainId: '0x64',
            ticker: 'XDAI',
            nickname: 'Gnosis',
            rpcPrefs: {
              blockExplorerUrl: 'https://gnosisscan.io',
            },
          },
          '581302a2-f713-40fd-9175-e25392b49a6e': {
            id: '581302a2-f713-40fd-9175-e25392b49a6e',
            rpcUrl: 'https://arbitrum-mainnet.infura.io/v3/12345abcd',
            chainId: '0xa4b1',
            ticker: 'ETH',
            nickname: 'Arbitrum One',
            rpcPrefs: {
              blockExplorerUrl: 'https://arbiscan.io',
            },
          },
          'a90c203e-8e27-415b-94e5-5d7f933d752a': {
            id: 'a90c203e-8e27-415b-94e5-5d7f933d752a',
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: '0xa86a',
            ticker: 'AVAX',
            nickname: 'Avalanche',
            rpcPrefs: {
              blockExplorerUrl: 'https://snowtrace.io',
            },
          },
          'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
            id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
            rpcUrl: 'https://developer-access-mainnet.base.org',
            chainId: '0x2105',
            ticker: 'ETH',
            nickname: 'Base',
            rpcPrefs: {
              blockExplorerUrl: 'https://basescan.org',
            },
          },
          '79377077-52dd-4960-9026-879ba34b0f26': {
            id: '79377077-52dd-4960-9026-879ba34b0f26',
            rpcUrl: 'https://zksync2-mainnet.zksync.io',
            chainId: '0x144',
            ticker: 'ETH',
            nickname: 'zkSync Era',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.zksync.io',
            },
          },
          '44bcb458-43bc-4c74-9a6b-3c85aa8e5e55': {
            id: '44bcb458-43bc-4c74-9a6b-3c85aa8e5e55',
            rpcUrl: 'https://rpc.zora.energy',
            chainId: '0x76adf1',
            ticker: 'ETH',
            nickname: 'Zora',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.zora.energy',
            },
          },
          '5ce58544-8df5-46c2-a7b2-8d79fdd88241': {
            rpcUrl: 'https://sepolia.era.zksync.dev',
            chainId: '0x12c',
            ticker: 'ETH',
            nickname: 'zkSync Sepolia Testnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://sepolia.explorer.zksync.io/',
            },
            id: '5ce58544-8df5-46c2-a7b2-8d79fdd88241',
          },
          'c15d0a4c-ded8-4155-964a-a9613e70c3dc': {
            id: 'c15d0a4c-ded8-4155-964a-a9613e70c3dc',
            rpcUrl: 'https://rpc.degen.tips',
            chainId: '0x27bc86aa',
            ticker: 'DEGEN',
            nickname: 'Degen',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.degen.tips',
            },
          },
          'd73386c9-308f-49c7-a566-a1a513780e8e': {
            id: 'd73386c9-308f-49c7-a566-a1a513780e8e',
            rpcUrl: 'https://bsc-dataseed1.binance.org/',
            chainId: '0x38',
            ticker: 'BNB',
            nickname: 'BNB Smart Chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://bscscan.com',
            },
          },
          '411511b5-6e6c-4e30-8563-d67c4d0126b4': {
            id: '411511b5-6e6c-4e30-8563-d67c4d0126b4',
            rpcUrl: 'https://rpc.ham.fun',
            chainId: '0x13f8',
            ticker: 'ETH',
            nickname: 'Ham',
            rpcPrefs: {
              blockExplorerUrl: 'https://explorer.ham.fun',
            },
          },
        },
        providerConfig: {
          type: 'rpc',
          ticker: 'ETH',
          chainId: '0x2105',
          rpcPrefs: {
            blockExplorerUrl: 'https://basescan.org',
          },
          rpcUrl: 'https://developer-access-mainnet.base.org',
          nickname: 'Base',
          id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #43', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 43: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid NetworkController state: 'object'",
      scenario: 'NetworkController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { providerConfig: null },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid NetworkController providerConfig state: 'object'",
      scenario: 'providerConfig is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurations: null,
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid NetworkController networkConfigurations state: 'object'",
      scenario: 'networkConfigurations is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurations: {
                '92c0e479-6133-4a18-b1bf-fa38f654e293': null,
              },
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 43: Invalid NetworkController network configuration entry with id: '92c0e479-6133-4a18-b1bf-fa38f654e293', type: 'null'",
      scenario: 'networkConfigurations is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should add selectNetworkClientId and ids to NetworkController state properties', () => {
    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);
  });
  it('should add select network client id with provider config id if it is available', () => {
    const oldState2 = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://developer-access-mainnet.base.org',
              nickname: 'Base',
              id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b596',
            },
          },
        },
      },
    };
    const expectedState2 = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'a50a052d-b0e3-48f7-b1d2-e795fb52b596',
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://developer-access-mainnet.base.org',
              nickname: 'Base',
              id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b596',
            },
          },
        },
      },
    };
    const newState = migrate(oldState2);

    expect(newState).toStrictEqual(expectedState2);
  });
  it('should default selected network id to mainnet if no id is found', () => {
    const oldState3 = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://not-match-rpc-url.com',
              nickname: 'Base',
            },
          },
        },
      },
    };
    const expectedState3 = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://not-match-rpc-url.com',
              nickname: 'Base',
            },
          },
        },
      },
    };

    const newState = migrate(oldState3);

    expect(newState).toStrictEqual(expectedState3);
  });
  it('should populate selected network id to network configurations if no id is found on provider config, but the rpcUrl matches the network configuration', () => {
    const oldState4 = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://developer-access-mainnet.base.org',
              nickname: 'Base',
            },
          },
        },
      },
    };
    const expectedState4 = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
            networkConfigurations: {
              'a50a052d-b0e3-48f7-b1d2-e795fb52b485': {
                id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
                rpcUrl: 'https://developer-access-mainnet.base.org',
                chainId: '0x2105',
                ticker: 'ETH',
                nickname: 'Base',
                rpcPrefs: {
                  blockExplorerUrl: 'https://basescan.org',
                },
              },
            },
            providerConfig: {
              type: 'rpc',
              ticker: 'ETH',
              chainId: '0x2105',
              rpcPrefs: {
                blockExplorerUrl: 'https://basescan.org',
              },
              rpcUrl: 'https://developer-access-mainnet.base.org',
              nickname: 'Base',
              id: 'a50a052d-b0e3-48f7-b1d2-e795fb52b485',
            },
          },
        },
      },
    };

    const newState = migrate(oldState4);

    expect(newState).toStrictEqual(expectedState4);
  });
});
