import {
  selectIsFirstTimeUser,
  selectTradeConfiguration,
  selectPendingTradeConfiguration,
  selectWatchlistMarkets,
  selectIsWatchlistMarket,
  selectHasPlacedFirstOrder,
  selectMarketFilterPreferences,
} from './selectors';
import type { PerpsControllerState } from './PerpsController';
import { MARKET_SORTING_CONFIG } from '../constants/perpsConfig';

describe('PerpsController selectors', () => {
  describe('selectIsFirstTimeUser', () => {
    it('returns true when state is undefined', () => {
      expect(selectIsFirstTimeUser(undefined)).toBe(true);
    });

    it('returns true when isFirstTimeUser is true', () => {
      const state = {
        isFirstTimeUser: { testnet: true, mainnet: true },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(true);
    });

    it('returns false when isFirstTimeUser is false', () => {
      const state = {
        isFirstTimeUser: { testnet: false, mainnet: false },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(false);
    });

    it('returns true when isFirstTimeUser is undefined in state', () => {
      const state = {} as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(true);
    });
  });

  describe('selectTradeConfiguration', () => {
    it('returns saved config for mainnet when not testnet', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: { leverage: 10 },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectTradeConfiguration(state, 'BTC');

      expect(result).toEqual({ leverage: 10 });
    });

    it('returns saved config for testnet when testnet', () => {
      const state = {
        isTestnet: true,
        tradeConfigurations: {
          mainnet: {},
          testnet: {
            ETH: { leverage: 5 },
          },
        },
      } as unknown as PerpsControllerState;

      const result = selectTradeConfiguration(state, 'ETH');

      expect(result).toEqual({ leverage: 5 });
    });

    it('returns undefined when no config exists for asset', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {},
          testnet: {},
        },
      } as PerpsControllerState;

      const result = selectTradeConfiguration(state, 'BTC');

      expect(result).toBeUndefined();
    });

    it('returns undefined when config exists but has no leverage', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {},
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectTradeConfiguration(state, 'BTC');

      expect(result).toBeUndefined();
    });

    it('returns config for specific asset when multiple assets configured', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: { leverage: 10 },
            ETH: { leverage: 5 },
            SOL: { leverage: 3 },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const ethResult = selectTradeConfiguration(state, 'ETH');
      const btcResult = selectTradeConfiguration(state, 'BTC');

      expect(ethResult).toEqual({ leverage: 5 });
      expect(btcResult).toEqual({ leverage: 10 });
    });
  });

  describe('selectWatchlistMarkets', () => {
    it('returns mainnet watchlist when not on testnet', () => {
      const state = {
        isTestnet: false,
        watchlistMarkets: {
          mainnet: ['BTC', 'ETH', 'SOL'],
          testnet: ['DOGE'],
        },
      } as unknown as PerpsControllerState;

      const result = selectWatchlistMarkets(state);

      expect(result).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('returns testnet watchlist when on testnet', () => {
      const state = {
        isTestnet: true,
        watchlistMarkets: {
          mainnet: ['BTC', 'ETH'],
          testnet: ['DOGE', 'PEPE'],
        },
      } as unknown as PerpsControllerState;

      const result = selectWatchlistMarkets(state);

      expect(result).toEqual(['DOGE', 'PEPE']);
    });

    it('returns empty array when watchlist is undefined', () => {
      const state = {
        isTestnet: false,
      } as unknown as PerpsControllerState;

      const result = selectWatchlistMarkets(state);

      expect(result).toEqual([]);
    });
  });

  describe('selectIsWatchlistMarket', () => {
    it('returns true when market is in watchlist', () => {
      const state = {
        isTestnet: false,
        watchlistMarkets: {
          mainnet: ['BTC', 'ETH', 'SOL'],
          testnet: [],
        },
      } as unknown as PerpsControllerState;

      const result = selectIsWatchlistMarket(state, 'ETH');

      expect(result).toBe(true);
    });

    it('returns false when market is not in watchlist', () => {
      const state = {
        isTestnet: false,
        watchlistMarkets: {
          mainnet: ['BTC', 'ETH'],
          testnet: [],
        },
      } as unknown as PerpsControllerState;

      const result = selectIsWatchlistMarket(state, 'SOL');

      expect(result).toBe(false);
    });
  });

  describe('selectHasPlacedFirstOrder', () => {
    it('returns mainnet value when not on testnet', () => {
      const state = {
        isTestnet: false,
        hasPlacedFirstOrder: {
          mainnet: true,
          testnet: false,
        },
      } as unknown as PerpsControllerState;

      const result = selectHasPlacedFirstOrder(state);

      expect(result).toBe(true);
    });

    it('returns testnet value when on testnet', () => {
      const state = {
        isTestnet: true,
        hasPlacedFirstOrder: {
          mainnet: true,
          testnet: false,
        },
      } as unknown as PerpsControllerState;

      const result = selectHasPlacedFirstOrder(state);

      expect(result).toBe(false);
    });

    it('returns false when hasPlacedFirstOrder is undefined', () => {
      const state = {
        isTestnet: false,
      } as unknown as PerpsControllerState;

      const result = selectHasPlacedFirstOrder(state);

      expect(result).toBe(false);
    });
  });

  describe('selectMarketFilterPreferences', () => {
    it('returns saved filter preferences when defined', () => {
      const state = {
        marketFilterPreferences: 'price',
      } as unknown as PerpsControllerState;

      const result = selectMarketFilterPreferences(state);

      expect(result).toBe('price');
    });

    it('returns default volume when preference is undefined', () => {
      const state = {} as unknown as PerpsControllerState;

      const result = selectMarketFilterPreferences(state);

      expect(result).toBe(MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID);
    });
  });

  describe('selectPendingTradeConfiguration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns pending config for mainnet when not testnet and not expired', () => {
      const now = Date.now();
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {
              leverage: 10,
              pendingConfig: {
                amount: '100',
                leverage: 5,
                takeProfitPrice: '50000',
                stopLossPrice: '40000',
                limitPrice: '45000',
                orderType: 'limit',
                timestamp: now,
              },
            },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'BTC');

      expect(result).toEqual({
        amount: '100',
        leverage: 5,
        takeProfitPrice: '50000',
        stopLossPrice: '40000',
        limitPrice: '45000',
        orderType: 'limit',
      });
    });

    it('returns undefined for expired pending config (more than 5 minutes)', () => {
      const fiveMinutesAgo = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {
              leverage: 10,
              pendingConfig: {
                amount: '100',
                leverage: 5,
                timestamp: fiveMinutesAgo,
              },
            },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'BTC');

      expect(result).toBeUndefined();
    });

    it('returns pending config for valid config (less than 5 minutes)', () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {
              leverage: 10,
              pendingConfig: {
                amount: '100',
                leverage: 5,
                orderType: 'market',
                timestamp: twoMinutesAgo,
              },
            },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'BTC');

      expect(result).toEqual({
        amount: '100',
        leverage: 5,
        orderType: 'market',
      });
    });

    it('returns undefined when no pending config exists', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {
              leverage: 10,
            },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'BTC');

      expect(result).toBeUndefined();
    });

    it('returns pending config for testnet when on testnet', () => {
      const now = Date.now();
      const state = {
        isTestnet: true,
        tradeConfigurations: {
          mainnet: {},
          testnet: {
            ETH: {
              leverage: 5,
              pendingConfig: {
                amount: '200',
                leverage: 10,
                timestamp: now,
              },
            },
          },
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'ETH');

      expect(result).toEqual({
        amount: '200',
        leverage: 10,
      });
    });

    it('returns undefined when config exists but has no pendingConfig', () => {
      const state = {
        isTestnet: false,
        tradeConfigurations: {
          mainnet: {
            BTC: {
              leverage: 10,
            },
          },
          testnet: {},
        },
      } as unknown as PerpsControllerState;

      const result = selectPendingTradeConfiguration(state, 'BTC');

      expect(result).toBeUndefined();
    });
  });
});
