import { selectIsFirstTimeUser, selectTradeConfiguration } from './selectors';
import type { PerpsControllerState } from './PerpsController';

describe('PerpsController selectors', () => {
  describe('selectIsFirstTimeUser', () => {
    it('should return true when state is undefined', () => {
      expect(selectIsFirstTimeUser(undefined)).toBe(true);
    });

    it('should return true when isFirstTimeUser is true', () => {
      const state = {
        isFirstTimeUser: { testnet: true, mainnet: true },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(true);
    });

    it('should return false when isFirstTimeUser is false', () => {
      const state = {
        isFirstTimeUser: { testnet: false, mainnet: false },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(false);
    });

    it('should return true when isFirstTimeUser is undefined in state', () => {
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
});
