import { KnownCaipNamespace } from '@metamask/utils';

import {
  caipAccountIdDecimalToHex,
  caipAccountIdHexToDecimal,
  caipChainIdDecimalToHex,
  caipChainIdHexToDecimal,
} from './utils';

describe('multichain/utils - CAIP normalizers', () => {
  describe('caipChainIdHexToDecimal', () => {
    it('converts a hex reference to decimal when the namespace matches', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'tron:0x2b6653dc'),
      ).toBe('tron:728126428');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'eip155:0x1'),
      ).toBe('eip155:0x1');
    });

    it('is idempotent for already-decimal references', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'tron:728126428'),
      ).toBe('tron:728126428');
    });

    it('passes through invalid CAIP-2 inputs', () => {
      expect(() =>
        // @ts-expect-error - intentionally malformed
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'not-a-caip-id'),
      ).toThrow();
    });
  });

  describe('caipChainIdDecimalToHex', () => {
    it('converts a decimal reference to hex when the namespace matches', () => {
      expect(
        caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'tron:728126428'),
      ).toBe('tron:0x2b6653dc');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'eip155:1')).toBe(
        'eip155:1',
      );
    });

    it('is idempotent for already-hex references', () => {
      expect(
        caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'tron:0x2b6653dc'),
      ).toBe('tron:0x2b6653dc');
    });

    it('leaves non-numeric, non-hex references untouched', () => {
      // Solana mainnet — base58 reference, neither decimal nor hex.
      expect(
        caipChainIdDecimalToHex(
          KnownCaipNamespace.Solana,
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ),
      ).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });
  });

  describe('caipAccountIdHexToDecimal', () => {
    it('re-anchors the account on a hex→decimal-converted chain id', () => {
      expect(
        caipAccountIdHexToDecimal(
          KnownCaipNamespace.Tron,
          'tron:0x2b6653dc:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS',
        ),
      ).toBe('tron:728126428:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipAccountIdHexToDecimal(
          KnownCaipNamespace.Tron,
          'eip155:0x1:0xa85be355bc2ceed42f916159692cf516edf7e9bd',
        ),
      ).toBe('eip155:0x1:0xa85be355bc2ceed42f916159692cf516edf7e9bd');
    });
  });

  describe('caipAccountIdDecimalToHex', () => {
    it('re-anchors the account on a decimal→hex-converted chain id', () => {
      expect(
        caipAccountIdDecimalToHex(
          KnownCaipNamespace.Tron,
          'tron:728126428:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS',
        ),
      ).toBe('tron:0x2b6653dc:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipAccountIdDecimalToHex(
          KnownCaipNamespace.Tron,
          'eip155:1:0xa85be355bc2ceed42f916159692cf516edf7e9bd',
        ),
      ).toBe('eip155:1:0xa85be355bc2ceed42f916159692cf516edf7e9bd');
    });
  });
});
