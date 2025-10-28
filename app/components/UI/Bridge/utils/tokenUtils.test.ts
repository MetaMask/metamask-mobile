import { constants } from 'ethers';
import { getNativeSourceToken, getDefaultDestToken } from './tokenUtils';
import {
  getNativeAssetForChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';

// Mock dependencies
jest.mock('@metamask/utils', () => {
  const actual = jest.requireActual('@metamask/utils');
  return {
    ...actual,
    isCaipAssetType: jest.fn(actual.isCaipAssetType),
    parseCaipAssetType: jest.fn(actual.parseCaipAssetType),
    parseCaipChainId: jest.fn(actual.parseCaipChainId),
  };
});

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    getNativeAssetForChainId: jest.fn(actual.getNativeAssetForChainId),
    isNonEvmChainId: jest.fn(actual.isNonEvmChainId),
  };
});

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

describe('tokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNativeSourceToken', () => {
    it('returns formatted native token for EVM chain', () => {
      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ether',
        symbol: 'ETH',
        image: '',
        decimals: 18,
        chainId: '0x1',
      });
    });

    it('returns formatted native token for Solana chain using assetId', () => {
      const result = getNativeSourceToken(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      expect(result).toEqual({
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        name: 'Solana',
        symbol: 'SOL',
        image: '',
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('returns native token with icon when iconUrl present', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        iconUrl: 'https://example.com/eth-icon.png',
      };

      (isNonEvmChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        image: 'https://example.com/eth-icon.png',
        decimals: 18,
        chainId: '0x1',
      });
    });

    it('returns native token with empty name when name missing', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        symbol: 'ETH',
        decimals: 18,
      };

      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: '',
        symbol: 'ETH',
        image: '',
        decimals: 18,
        chainId: '0x1',
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
      expect(result?.symbol).toBe('mUSD');
      expect(result?.name).toBe('MetaMask USD');
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
      const nonCaipString = 'notacaipformat';
      // @ts-expect-error - Testing edge case with invalid input
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
