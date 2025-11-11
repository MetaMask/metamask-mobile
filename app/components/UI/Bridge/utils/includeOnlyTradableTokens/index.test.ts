import { includeOnlyTradableTokens } from './index';
import { BridgeToken } from '../../types';

// Helper function to create test tokens
const createTestToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x123',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  ...overrides,
});

describe('includeOnlyTradableTokens', () => {
  describe('returns true for tradable tokens', () => {
    it('returns true for EVM chain token', () => {
      const token = createTestToken({
        chainId: '0x1',
        name: 'Ethereum',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Solana chain token', () => {
      const token = createTestToken({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana Token',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron chain token with tradable name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'USDT',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for token without name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: undefined,
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for token with empty name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: '',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });
  });

  describe('returns false for non-tradable Tron tokens', () => {
    it('returns false for Tron Energy token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Energy',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron Bandwidth token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Bandwidth',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron Max Bandwidth token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Max Bandwidth',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });

    it('returns false for Energy token with lowercase name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'energy',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });

    it('returns false for Bandwidth token with uppercase name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'BANDWIDTH',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });

    it('returns false for Max Bandwidth token with mixed case name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'mAx BaNdWiDtH',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns true for Energy token on non-Tron chain', () => {
      const token = createTestToken({
        chainId: '0x1',
        name: 'Energy',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Bandwidth token on non-Tron chain', () => {
      const token = createTestToken({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Bandwidth',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Max Bandwidth token on non-Tron chain', () => {
      const token = createTestToken({
        chainId: '0x38',
        name: 'Max Bandwidth',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for token with name containing Energy as substring', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Solar Energy Token',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for token with name containing Bandwidth as substring', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'High Bandwidth Network',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with whitespace in name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: '  Energy  ',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for token with undefined chainId', () => {
      const token = {
        ...createTestToken({
          name: 'Energy',
        }),
        chainId: undefined,
      } as unknown as BridgeToken;

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with chainId not containing tron prefix', () => {
      const token = createTestToken({
        chainId: '0x2b6653dc',
        name: 'Energy',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(true);
    });

    it('returns false for Tron token with chainId containing tron anywhere', () => {
      const token = createTestToken({
        chainId: 'eip155:tron:123',
        name: 'Energy',
      });

      const result = includeOnlyTradableTokens(token);

      expect(result).toBe(false);
    });
  });
});
