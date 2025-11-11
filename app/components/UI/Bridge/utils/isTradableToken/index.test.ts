import { isTradableToken } from './index';
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

describe('isTradableToken', () => {
  describe('tradable tokens', () => {
    it('returns true for EVM chain token', () => {
      const token = createTestToken({
        chainId: '0x1',
        name: 'Ethereum',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Solana chain token', () => {
      const token = createTestToken({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana Token',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron chain token with standard name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'USDT',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token without name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: undefined,
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with empty name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: '',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Energy token on non-Tron chain', () => {
      const token = createTestToken({
        chainId: '0x1',
        name: 'Energy',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Bandwidth token on Solana chain', () => {
      const token = createTestToken({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Bandwidth',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Max Bandwidth token on BSC chain', () => {
      const token = createTestToken({
        chainId: '0x38',
        name: 'Max Bandwidth',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with Energy substring in name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Solar Energy Token',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with Bandwidth substring in name', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'High Bandwidth Network',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Tron token with whitespace around Energy', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: '  Energy  ',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for token with undefined chainId', () => {
      const token = {
        ...createTestToken({
          name: 'Energy',
        }),
        chainId: undefined,
      } as unknown as BridgeToken;

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });

    it('returns true for Energy token with non-Tron CAIP chainId', () => {
      const token = createTestToken({
        chainId: '0x2b6653dc',
        name: 'Energy',
      });

      const result = isTradableToken(token);

      expect(result).toBe(true);
    });
  });

  describe('non-tradable Tron resource tokens', () => {
    it('returns false for Tron Energy token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Energy',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron Bandwidth token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Bandwidth',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron Max Bandwidth token', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'Max Bandwidth',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron energy token with lowercase', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'energy',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron bandwidth token with uppercase', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'BANDWIDTH',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron max bandwidth token with mixed case', () => {
      const token = createTestToken({
        chainId: 'tron:0x2b6653dc',
        name: 'mAx BaNdWiDtH',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });

    it('returns false for Tron Energy with chainId containing tron prefix anywhere', () => {
      const token = createTestToken({
        chainId: 'eip155:tron:123',
        name: 'Energy',
      });

      const result = isTradableToken(token);

      expect(result).toBe(false);
    });
  });
});
