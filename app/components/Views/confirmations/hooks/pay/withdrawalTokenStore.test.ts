import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { withdrawalTokenStore } from './withdrawalTokenStore';
import { POLYGON_USDCE } from '../../constants/predict';

describe('withdrawalTokenStore', () => {
  beforeEach(() => {
    withdrawalTokenStore.reset();
  });

  describe('getToken', () => {
    it('returns default Polygon USDC.e token initially', () => {
      const token = withdrawalTokenStore.getToken();

      expect(token.address).toBe(POLYGON_USDCE.address);
      expect(token.chainId).toBe(CHAIN_IDS.POLYGON);
      expect(token.symbol).toBe(POLYGON_USDCE.symbol);
      expect(token.decimals).toBe(POLYGON_USDCE.decimals);
    });
  });

  describe('setToken', () => {
    it('updates the stored token', () => {
      const newToken = {
        address: '0xNewToken' as Hex,
        chainId: '0x38' as Hex,
        symbol: 'TEST',
        decimals: 18,
      };

      withdrawalTokenStore.setToken(newToken);

      const token = withdrawalTokenStore.getToken();
      expect(token.address).toBe(newToken.address);
      expect(token.chainId).toBe(newToken.chainId);
      expect(token.symbol).toBe(newToken.symbol);
      expect(token.decimals).toBe(newToken.decimals);
    });

    it('notifies listeners when token changes', () => {
      const listener = jest.fn();
      withdrawalTokenStore.subscribe(listener);

      withdrawalTokenStore.setToken({
        address: '0xNewToken' as Hex,
        chainId: '0x38' as Hex,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('resets to default token', () => {
      withdrawalTokenStore.setToken({
        address: '0xNewToken' as Hex,
        chainId: '0x38' as Hex,
        symbol: 'TEST',
      });

      withdrawalTokenStore.reset();

      const token = withdrawalTokenStore.getToken();
      expect(token.address).toBe(POLYGON_USDCE.address);
      expect(token.chainId).toBe(CHAIN_IDS.POLYGON);
    });

    it('notifies listeners when reset', () => {
      const listener = jest.fn();
      withdrawalTokenStore.subscribe(listener);

      withdrawalTokenStore.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = withdrawalTokenStore.subscribe(listener);

      withdrawalTokenStore.setToken({
        address: '0xToken1' as Hex,
        chainId: '0x1' as Hex,
      });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      withdrawalTokenStore.setToken({
        address: '0xToken2' as Hex,
        chainId: '0x2' as Hex,
      });

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      withdrawalTokenStore.subscribe(listener1);
      withdrawalTokenStore.subscribe(listener2);

      withdrawalTokenStore.setToken({
        address: '0xNewToken' as Hex,
        chainId: '0x38' as Hex,
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});
