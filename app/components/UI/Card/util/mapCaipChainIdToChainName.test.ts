import { CaipChainId } from '@metamask/utils';
import { mapCaipChainIdToChainName } from './mapCaipChainIdToChainName';

describe('mapCaipChainIdToChainName', () => {
  describe('mapped chain IDs', () => {
    it('returns Linea for Linea mainnet chain ID', () => {
      const caipChainId = 'eip155:59144' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Base for Base mainnet chain ID', () => {
      const caipChainId = 'eip155:8453' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Base');
    });

    it('returns Solana for Solana mainnet chain ID', () => {
      const caipChainId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Solana');
    });
  });

  describe('unmapped chain IDs', () => {
    it('returns Linea for Ethereum mainnet chain ID', () => {
      const caipChainId = 'eip155:1' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Linea for Polygon mainnet chain ID', () => {
      const caipChainId = 'eip155:137' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Linea for Arbitrum mainnet chain ID', () => {
      const caipChainId = 'eip155:42161' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Linea for Optimism mainnet chain ID', () => {
      const caipChainId = 'eip155:10' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Linea for unknown chain namespace', () => {
      const caipChainId = 'unknown:12345' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });

    it('returns Linea for unknown Solana chain ID', () => {
      const caipChainId =
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as CaipChainId;

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
    });
  });
});
