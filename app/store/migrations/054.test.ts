import migrate from './054';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import mockedEngine from '../../core/__mocks__/MockedEngine';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Migration #54', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 54: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 54: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 54: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { TokensController: null },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 54: Invalid TokensController state error: 'object'",
      scenario: 'TokensController is invalid',
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

  it('should update hasBalanceError to false in tokensController state', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                balanceError: null,
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                balanceError: null,
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                hasBalanceError: false,
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                hasBalanceError: false,
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should update hasBalanceError to true in tokensController state', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                balanceError: new Error('error'),
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                balanceError: new Error('error'),
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                hasBalanceError: true,
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                hasBalanceError: true,
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should not change if balanceError is undefined in tokensController state', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                aggregators: [
                  'Metamask',
                  'Aave',
                  'Bancor',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Sushiswap',
                  'Zerion',
                  'Lifi',
                  'Socket',
                  'Squid',
                  'Openswap',
                  'Sonarwatch',
                  'UniswapLabs',
                  'Coinmarketcap',
                ],
                decimals: 6,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
                name: 'USDC',
                symbol: 'USDC',
              },
            ],
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should not change if tokens array is not defined', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TokensController: {},
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          TokensController: {},
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
  it('should not change if tokens array is empty', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [],
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [],
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
