import { CaipChainId } from '@metamask/utils';
import { mapCaipChainIdToChainName } from './mapCaipChainIdToChainName';

jest.mock('@metamask/bridge-controller', () => ({
  isSolanaChainId: jest.fn(),
}));

import { isSolanaChainId } from '@metamask/bridge-controller';

const mockIsSolanaChainId = isSolanaChainId as jest.MockedFunction<
  typeof isSolanaChainId
>;

describe('mapCaipChainIdToChainName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Solana chain IDs', () => {
    it('returns Solana for Solana mainnet chain ID', () => {
      const caipChainId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(true);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Solana');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
      expect(mockIsSolanaChainId).toHaveBeenCalledTimes(1);
    });

    it('returns Solana for Solana devnet chain ID', () => {
      const caipChainId =
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(true);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Solana');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Solana for Solana testnet chain ID', () => {
      const caipChainId =
        'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(true);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Solana');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });
  });

  describe('non-Solana chain IDs', () => {
    it('returns Linea for Linea mainnet chain ID', () => {
      const caipChainId = 'eip155:59144' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Linea for Ethereum mainnet chain ID', () => {
      const caipChainId = 'eip155:1' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Linea for Polygon mainnet chain ID', () => {
      const caipChainId = 'eip155:137' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Linea for Arbitrum mainnet chain ID', () => {
      const caipChainId = 'eip155:42161' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Linea for Optimism mainnet chain ID', () => {
      const caipChainId = 'eip155:10' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });
  });

  describe('edge cases', () => {
    it('returns Linea for unknown chain namespace', () => {
      const caipChainId = 'unknown:12345' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Linea for invalid CAIP format when isSolanaChainId returns false', () => {
      const caipChainId = 'invalid-format' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(false);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Linea');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });

    it('returns Solana for invalid CAIP format when isSolanaChainId returns true', () => {
      const caipChainId = 'invalid-format' as CaipChainId;
      mockIsSolanaChainId.mockReturnValue(true);

      const result = mapCaipChainIdToChainName(caipChainId);

      expect(result).toBe('Solana');
      expect(mockIsSolanaChainId).toHaveBeenCalledWith(caipChainId);
    });
  });
});
