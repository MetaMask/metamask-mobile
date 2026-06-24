import type { Position, Trade } from '@metamask/social-controllers';
import {
  getPerpPositionDirection,
  getPerpTradeDirection,
  isPerpPosition,
  isPerpTrade,
} from './perp';

const basePosition = {
  perpPositionType: null,
  chain: 'base',
  positionAmount: 100,
} as unknown as Position;

const baseTrade = {
  classification: null,
  perpPositionType: null,
  direction: 'buy',
} as unknown as Trade;

describe('perp utils', () => {
  describe('isPerpPosition', () => {
    it('returns false for a spot position', () => {
      expect(isPerpPosition(basePosition)).toBe(false);
    });

    it('returns true when perpPositionType is set', () => {
      expect(
        isPerpPosition({ ...basePosition, perpPositionType: 'long' }),
      ).toBe(true);
    });

    it('returns true for a hyperliquid position even without a perp marker', () => {
      expect(
        isPerpPosition({
          ...basePosition,
          chain: 'hyperliquid',
          perpPositionType: null,
        }),
      ).toBe(true);
    });

    it('is case-insensitive on the chain name', () => {
      expect(isPerpPosition({ ...basePosition, chain: 'Hyperliquid' })).toBe(
        true,
      );
    });
  });

  describe('getPerpPositionDirection', () => {
    it('returns null for a spot position', () => {
      expect(getPerpPositionDirection(basePosition)).toBeNull();
    });

    it('prefers the explicit perpPositionType', () => {
      expect(
        getPerpPositionDirection({
          ...basePosition,
          chain: 'hyperliquid',
          perpPositionType: 'short',
          positionAmount: 100,
        }),
      ).toBe('short');
    });

    it('returns null when perpPositionType is absent, even on hyperliquid', () => {
      // Clicker reports perp size as a positive magnitude and conveys direction
      // only via perpPositionType, so the sign of positionAmount must not be
      // used to fabricate a side (HL spot tokens can carry a negative amount).
      expect(
        getPerpPositionDirection({
          ...basePosition,
          chain: 'hyperliquid',
          perpPositionType: null,
          positionAmount: 5,
        }),
      ).toBeNull();
      expect(
        getPerpPositionDirection({
          ...basePosition,
          chain: 'hyperliquid',
          perpPositionType: null,
          positionAmount: -5,
        }),
      ).toBeNull();
    });
  });

  describe('isPerpTrade', () => {
    it('returns false for a spot trade', () => {
      expect(isPerpTrade(baseTrade)).toBe(false);
    });

    it('returns true for a perp-classified trade', () => {
      expect(isPerpTrade({ ...baseTrade, classification: 'perp' })).toBe(true);
    });

    it('returns true when perpPositionType is set', () => {
      expect(isPerpTrade({ ...baseTrade, perpPositionType: 'long' })).toBe(
        true,
      );
    });
  });

  describe('getPerpTradeDirection', () => {
    it('returns null for a spot trade', () => {
      expect(getPerpTradeDirection(baseTrade)).toBeNull();
    });

    it('prefers the explicit perpPositionType', () => {
      expect(
        getPerpTradeDirection({
          ...baseTrade,
          classification: 'perp',
          perpPositionType: 'short',
          direction: 'buy',
        }),
      ).toBe('short');
    });

    it('infers long from a buy on a perp-classified trade', () => {
      expect(
        getPerpTradeDirection({
          ...baseTrade,
          classification: 'perp',
          direction: 'buy',
        }),
      ).toBe('long');
    });

    it('infers short from a sell on a perp-classified trade', () => {
      expect(
        getPerpTradeDirection({
          ...baseTrade,
          classification: 'perp',
          direction: 'sell',
        }),
      ).toBe('short');
    });
  });
});
