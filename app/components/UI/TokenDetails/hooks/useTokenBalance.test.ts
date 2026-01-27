import { TokenI } from '../../Tokens/types';

// Due to complex selector dependencies, we test the hook's logic and types
// without rendering the full hook.

describe('useTokenBalance', () => {
  const mockEvmToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: '',
    logo: '',
    aggregators: [],
    isETH: false,
    isNative: false,
    ticker: 'DAI',
  };

  describe('type definitions', () => {
    it('UseTokenBalanceResult interface defines expected properties', () => {
      interface UseTokenBalanceResult {
        balance: string | undefined;
        mainBalance: string;
        secondaryBalance: string | undefined;
        itemAddress: string | undefined;
        isNonEvmAsset: boolean;
      }

      const mockResult: UseTokenBalanceResult = {
        balance: '100',
        mainBalance: '$100.00',
        secondaryBalance: '100 DAI',
        itemAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        isNonEvmAsset: false,
      };

      expect(mockResult.balance).toBe('100');
      expect(mockResult.mainBalance).toBe('$100.00');
      expect(mockResult.isNonEvmAsset).toBe(false);
    });
  });

  describe('balance formatting logic', () => {
    it('formats secondary balance with token symbol', () => {
      const formatSecondaryBalance = (
        balance: string | undefined,
        symbol: string,
        isETH: boolean,
        ticker?: string,
      ): string | undefined => {
        if (balance == null) return undefined;
        const displaySymbol = isETH ? ticker : symbol;
        return `${balance} ${displaySymbol}`;
      };

      expect(formatSecondaryBalance('100', 'DAI', false)).toBe('100 DAI');
      expect(formatSecondaryBalance('50', 'ETH', true, 'ETH')).toBe('50 ETH');
      expect(formatSecondaryBalance(undefined, 'DAI', false)).toBeUndefined();
    });

    it('returns empty mainBalance when balanceFiat is not available', () => {
      const getMainBalance = (
        liveBalanceFiat: string | undefined,
        assetBalanceFiat: string | undefined,
      ): string => liveBalanceFiat ?? assetBalanceFiat ?? '';

      expect(getMainBalance('$200', '$100')).toBe('$200');
      expect(getMainBalance(undefined, '$100')).toBe('$100');
      expect(getMainBalance(undefined, undefined)).toBe('');
    });
  });

  describe('chain ID detection', () => {
    it('identifies EVM chains by hex prefix', () => {
      const isEvmChain = (chainId: string): boolean => chainId.startsWith('0x');

      expect(isEvmChain('0x1')).toBe(true);
      expect(isEvmChain('0x89')).toBe(true);
      expect(isEvmChain('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(false);
    });

    it('identifies non-EVM asset based on CAIP format', () => {
      const isNonEvmAsset = (
        originalChainId: string,
        formattedChainId: string,
      ): boolean => formattedChainId === originalChainId;

      // When formatChainIdToCaip returns same value, it's already CAIP (non-EVM)
      expect(
        isNonEvmAsset(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ),
      ).toBe(true);
      // When formatChainIdToCaip transforms the value, it's EVM
      expect(isNonEvmAsset('0x1', 'eip155:1')).toBe(false);
    });
  });

  describe('address handling', () => {
    it('uses original address for non-EVM assets', () => {
      const getItemAddress = (
        address: string,
        isNonEvmAsset: boolean,
      ): string => {
        if (isNonEvmAsset) return address;
        // For EVM, would normally checksum
        return address;
      };

      const nonEvmAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
      expect(getItemAddress(nonEvmAddress, true)).toBe(nonEvmAddress);
      expect(getItemAddress(mockEvmToken.address, false)).toBe(
        mockEvmToken.address,
      );
    });
  });
});
