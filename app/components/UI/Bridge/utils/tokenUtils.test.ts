import { constants } from 'ethers';
import { getNativeSourceToken, getDefaultDestToken } from './tokenUtils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';

// Mock dependencies
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipAssetType: jest.fn(),
  parseCaipAssetType: jest.fn(),
  parseCaipChainId: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  getNativeAssetForChainId: jest.fn(),
  isSolanaChainId: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

describe('tokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNativeSourceToken', () => {
    it('returns formatted native token for EVM chain', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        image: undefined,
        decimals: 18,
        chainId: 'eip155:1',
      });
      expect(getNativeAssetForChainId).toHaveBeenCalledWith('eip155:1');
      expect(isSolanaChainId).toHaveBeenCalledWith('eip155:1');
    });

    it('returns formatted native token for Solana chain using assetId', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        assetId: 'native-sol-asset-id',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      expect(result).toEqual({
        address: 'native-sol-asset-id',
        name: 'Solana',
        symbol: 'SOL',
        image: undefined,
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
      expect(getNativeAssetForChainId).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(isSolanaChainId).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });

    it('returns native token with icon when iconUrl present', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        iconUrl: 'https://example.com/eth-icon.png',
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        image: 'https://example.com/eth-icon.png',
        decimals: 18,
        chainId: 'eip155:1',
      });
    });

    it('returns native token with empty name when name missing', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        symbol: 'ETH',
        decimals: 18,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: '',
        symbol: 'ETH',
        image: undefined,
        decimals: 18,
        chainId: 'eip155:1',
      });
    });
  });

  describe('getDefaultDestToken', () => {
    it('returns token for direct hex chainId lookup', () => {
      const result = getDefaultDestToken(CHAIN_IDS.MAINNET);

      expect(result).toEqual(DefaultSwapDestTokens[CHAIN_IDS.MAINNET]);
      expect(result?.chainId).toBe(CHAIN_IDS.MAINNET);
    });

    it('returns token for another valid hex chainId', () => {
      const result = getDefaultDestToken(CHAIN_IDS.OPTIMISM);

      expect(result).toEqual(DefaultSwapDestTokens[CHAIN_IDS.OPTIMISM]);
      expect(result?.chainId).toBe(CHAIN_IDS.OPTIMISM);
    });

    it('returns undefined for hex chainId not in mapping', () => {
      const nonExistentChainId = '0x999999' as const;
      const result = getDefaultDestToken(nonExistentChainId);

      expect(result).toBeUndefined();
    });

    it('converts CAIP format to hex and returns matching token', () => {
      // eip155:1 should convert to 0x1 (MAINNET)
      const caipChainId = 'eip155:1';
      const result = getDefaultDestToken(caipChainId);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDC');
      expect(result?.name).toBe('USD Coin');
      expect(result?.chainId).toBe(caipChainId); // Should return with original CAIP format
    });

    it('converts CAIP format for Optimism and returns matching token', () => {
      // eip155:10 should convert to 0xa (OPTIMISM)
      const caipChainId = 'eip155:10';
      const result = getDefaultDestToken(caipChainId);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDC');
      expect(result?.chainId).toBe(caipChainId); // Should return with original CAIP format
    });

    it('converts CAIP format for BSC and returns matching token', () => {
      // eip155:56 should convert to 0x38 (BSC)
      const caipChainId = 'eip155:56';
      const result = getDefaultDestToken(caipChainId);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDT');
      expect(result?.chainId).toBe(caipChainId); // Should return with original CAIP format
    });

    it('returns undefined for CAIP format with no corresponding hex mapping', () => {
      // eip155:999999 should convert to 0xf423f but this won't exist in mapping
      const caipChainId = 'eip155:999999';
      const result = getDefaultDestToken(caipChainId);

      expect(result).toBeUndefined();
    });

    it('returns undefined for malformed CAIP format', () => {
      const malformedCaip = 'invalid:format:extra';
      const result = getDefaultDestToken(malformedCaip);

      expect(result).toBeUndefined();
    });

    it('returns undefined for CAIP format with non-numeric chain ID', () => {
      const invalidCaip = 'eip155:abc';
      const result = getDefaultDestToken(invalidCaip);

      expect(result).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      // @ts-expect-error - Testing edge case with invalid input
      const result = getDefaultDestToken('');

      expect(result).toBeUndefined();
    });

    it('returns undefined for string without colon (not CAIP format)', () => {
      // @ts-expect-error - Testing edge case with invalid input
      const nonCaipString = 'notacaipformat';
      const result = getDefaultDestToken(nonCaipString);

      expect(result).toBeUndefined();
    });

    it('handles edge case of CAIP format with zero chain ID', () => {
      // eip155:0 should convert to 0x0
      const caipChainId = 'eip155:0';
      const result = getDefaultDestToken(caipChainId);

      // This should return undefined since 0x0 is not in our mapping
      expect(result).toBeUndefined();
    });

    it('preserves token properties when converting CAIP to hex', () => {
      const caipChainId = 'eip155:1';
      const result = getDefaultDestToken(caipChainId);
      const originalToken = DefaultSwapDestTokens[CHAIN_IDS.MAINNET];

      expect(result).toBeDefined();
      expect(result?.address).toBe(originalToken.address);
      expect(result?.symbol).toBe(originalToken.symbol);
      expect(result?.name).toBe(originalToken.name);
      expect(result?.decimals).toBe(originalToken.decimals);
      expect(result?.image).toBe(originalToken.image);
      // Only chainId should be different (CAIP format instead of hex)
      expect(result?.chainId).toBe(caipChainId);
      expect(result?.chainId).not.toBe(originalToken.chainId);
    });
  });
});
