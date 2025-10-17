import { enhanceTokenWithIcon } from './tokenIconUtils';
import type { PerpsToken } from '../types';
import type {
  TokenListMap,
  TokenListToken,
} from '@metamask/assets-controllers';

// Mock isUrl to avoid import issues
jest.mock('is-url', () =>
  jest.fn((url: string) => {
    if (!url || url === 'ipfs://') return false; // ipfs:// alone is not valid
    return (
      url.startsWith('http') ||
      url.startsWith('data:') ||
      (url.startsWith('ipfs://') && url.length > 7)
    );
  }),
);

// Mock isIPFSUri
jest.mock('../../../../util/general', () => ({
  isIPFSUri: jest.fn((url: string) => {
    if (!url) return false;
    return url.startsWith('ipfs://');
  }),
}));

// Mock safeToChecksumAddress
jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn((address: string) => address),
}));

describe('tokenIconUtils', () => {
  const mockToken: PerpsToken = {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    chainId: '0xa4b1',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  };

  const mockTokenList: TokenListMap = {
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      iconUrl: 'https://example.com/usdc-icon.png',
      aggregators: [],
      occurrences: 1,
    },
    '0x1234567890123456789012345678901234567890': {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped Ether',
      iconUrl: 'ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM',
      aggregators: [],
      occurrences: 1,
    },
  };

  describe('enhanceTokenWithIcon', () => {
    it('should return token with empty image if no token list provided', () => {
      const result = enhanceTokenWithIcon({
        token: mockToken,
        tokenList: {} as TokenListMap,
        isIpfsGatewayEnabled: true,
      });

      expect(result).toEqual({
        ...mockToken,
        image: '',
        balance: undefined,
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      });
    });

    it('should add icon URL from token list', () => {
      const result = enhanceTokenWithIcon({
        token: mockToken,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: true,
      });

      expect(result).toEqual({
        ...mockToken,
        image: 'https://example.com/usdc-icon.png',
        balance: undefined,
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      });
    });

    it('should handle case-insensitive address matching', () => {
      const upperCaseToken = {
        ...mockToken,
        address: '0xAF88D065E77C8CC2239327C5EDB3A432268E5831',
      };

      const result = enhanceTokenWithIcon({
        token: upperCaseToken,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: true,
      });

      expect(result.image).toBe('https://example.com/usdc-icon.png');
    });

    it('should handle IPFS URLs when gateway is enabled', () => {
      const ipfsToken = {
        ...mockToken,
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'WETH',
        name: 'Wrapped Ether',
      };

      const result = enhanceTokenWithIcon({
        token: ipfsToken,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: true,
      });

      expect(result.image).toBe(
        'ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM',
      );
    });

    it('should skip IPFS URLs when gateway is disabled', () => {
      const ipfsToken = {
        ...mockToken,
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'WETH',
        name: 'Wrapped Ether',
      };

      const result = enhanceTokenWithIcon({
        token: ipfsToken,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: false,
      });

      // When IPFS is disabled, it should fall back to symbol search and not use IPFS URLs
      expect(result.image).toBe('');
    });

    it('should return token with empty image if no matching token in list', () => {
      const unknownToken = {
        ...mockToken,
        address: '0x9999999999999999999999999999999999999999',
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
      };

      const result = enhanceTokenWithIcon({
        token: unknownToken,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: true,
      });

      expect(result).toEqual({
        ...unknownToken,
        image: '',
        balance: undefined,
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      });
    });

    it('should handle tokens without iconUrl', () => {
      const tokenListWithoutIcon: TokenListMap = {
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          aggregators: [],
          occurrences: 1,
          iconUrl: '',
        } as TokenListToken,
      };

      const result = enhanceTokenWithIcon({
        token: mockToken,
        tokenList: tokenListWithoutIcon,
        isIpfsGatewayEnabled: true,
      });

      expect(result).toEqual({
        ...mockToken,
        image: '',
        balance: undefined,
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      });
    });

    it('should use existing image if token already has valid one', () => {
      const tokenWithImage = {
        ...mockToken,
        image: 'https://existing-image.com/icon.png',
      };

      const result = enhanceTokenWithIcon({
        token: tokenWithImage,
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: true,
      });

      // Should use the existing image
      expect(result.image).toBe('https://existing-image.com/icon.png');
    });

    it('should handle empty token list', () => {
      const result = enhanceTokenWithIcon({
        token: mockToken,
        tokenList: {},
        isIpfsGatewayEnabled: true,
      });

      expect(result).toEqual({
        ...mockToken,
        image: '',
        balance: undefined,
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      });
    });

    it('should handle malformed IPFS URLs', () => {
      const tokenListWithBadIPFS: TokenListMap = {
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          iconUrl: 'ipfs://', // Invalid IPFS URL
          aggregators: [],
          occurrences: 1,
        } as TokenListToken,
      };

      const result = enhanceTokenWithIcon({
        token: mockToken,
        tokenList: tokenListWithBadIPFS,
        isIpfsGatewayEnabled: true,
      });

      expect(result.image).toBe('');
    });

    it('should handle various URL protocols correctly', () => {
      const tokenListWithVariousURLs: TokenListMap = {
        '0x1111111111111111111111111111111111111111': {
          address: '0x1111111111111111111111111111111111111111',
          symbol: 'TOKEN1',
          decimals: 18,
          name: 'Token 1',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          aggregators: [],
          occurrences: 1,
        } as TokenListToken,
        '0x2222222222222222222222222222222222222222': {
          address: '0x2222222222222222222222222222222222222222',
          symbol: 'TOKEN2',
          decimals: 18,
          name: 'Token 2',
          iconUrl: 'https://example.com/token2.svg',
          aggregators: [],
          occurrences: 1,
        } as TokenListToken,
      };

      // Test data URL
      const token1 = {
        ...mockToken,
        address: '0x1111111111111111111111111111111111111111',
      };
      const result1 = enhanceTokenWithIcon({
        token: token1,
        tokenList: tokenListWithVariousURLs,
        isIpfsGatewayEnabled: true,
      });
      expect(result1.image).toBe(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
      );

      // Test https URL
      const token2 = {
        ...mockToken,
        address: '0x2222222222222222222222222222222222222222',
      };
      const result2 = enhanceTokenWithIcon({
        token: token2,
        tokenList: tokenListWithVariousURLs,
        isIpfsGatewayEnabled: true,
      });
      expect(result2.image).toBe('https://example.com/token2.svg');
    });

    it('should use symbol-based fallback for common tokens', () => {
      const tokenListWithUSDCOnDifferentChain: TokenListMap = {
        '0x0000000000000000000000000000000000000001': {
          address: '0x0000000000000000000000000000000000000001',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          iconUrl: 'https://example.com/usdc-fallback.png',
          aggregators: [],
          occurrences: 1,
        } as TokenListToken,
      };

      const differentAddressToken = {
        ...mockToken,
        address: '0x9999999999999999999999999999999999999999', // Different address
      };

      const result = enhanceTokenWithIcon({
        token: differentAddressToken,
        tokenList: tokenListWithUSDCOnDifferentChain,
        isIpfsGatewayEnabled: true,
      });

      // Should find USDC by symbol and use its icon
      expect(result.image).toBe('https://example.com/usdc-fallback.png');
    });
  });
});
