import { renderHook } from '@testing-library/react-hooks';
import { useShouldRenderMaxOption } from '.';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useTokenAddress } from '../useTokenAddress';
import { isNativeAddress } from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenAddress', () => ({
  useTokenAddress: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  isNativeAddress: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectIsGaslessSwapEnabled: jest.fn(),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTokenAddress = useTokenAddress as jest.MockedFunction<
  typeof useTokenAddress
>;
const mockIsNativeAddress = isNativeAddress as jest.MockedFunction<
  typeof isNativeAddress
>;

/**
 * IMPORTANT: useSelector call order in the hook:
 * 1. First call: isGaslessSwapEnabled (line 12 in hook)
 * 2. Second call: stxEnabled (line 15 in hook)
 */
describe('useShouldRenderMaxOption', () => {
  const mockToken: BridgeToken = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'TEST',
    decimals: 18,
    chainId: CHAIN_IDS.MAINNET,
  };

  const nativeToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: CHAIN_IDS.MAINNET,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokenAddress.mockReturnValue(mockToken.address);
    mockIsNativeAddress.mockReturnValue(false);
    // Default: isGaslessSwapEnabled = false, stxEnabled = true
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      // First call: isGaslessSwapEnabled = false
      // Second call: stxEnabled = true
      return callCount === 2;
    });
  });

  describe('Zero balance scenarios', () => {
    it('returns false when displayBalance is undefined', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, undefined, false),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when displayBalance is "0"', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0', false),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when displayBalance is "0.0"', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0.0', false),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when displayBalance is empty string', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '', false),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Non-native token scenarios', () => {
    beforeEach(() => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);
    });

    it('returns true for non-native token with balance regardless of gasless', () => {
      mockUseSelector.mockImplementation(() => false); // Both selectors false

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '100.5', false),
      );

      expect(result.current).toBe(true);
    });

    it('returns true for non-native token with balance regardless of stxEnabled', () => {
      mockUseSelector.mockImplementation(() => false); // stxEnabled = false

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '50', false),
      );

      expect(result.current).toBe(true);
    });

    it('returns true for non-native token with balance regardless of isQuoteSponsored', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '25.75', true),
      );

      expect(result.current).toBe(true);
    });

    it('returns true for non-native token with very small balance', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0.000001', false),
      );

      expect(result.current).toBe(true);
    });

    it('returns false for non-native token with zero balance', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0', false),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Native token scenarios', () => {
    beforeEach(() => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
    });

    it('returns false when native token has zero balance', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(nativeToken, '0', false),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when native token has zero balance even with all conditions favorable', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
      mockUseSelector.mockReturnValue(true); // stxEnabled=true, gasless=true

      const { result } = renderHook(
        () => useShouldRenderMaxOption(nativeToken, '0', true), // sponsored=true
      );

      // Zero balance always returns false
      expect(result.current).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('returns false when token is undefined', () => {
      mockUseTokenAddress.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(undefined, '100', false),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when token is undefined but has balance', () => {
      mockUseTokenAddress.mockReturnValue(undefined);
      mockIsNativeAddress.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(undefined, '500', false),
      );

      expect(result.current).toBe(false);
    });

    it('handles large balance values correctly for non-native tokens', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '1000000.123456789', false),
      );

      expect(result.current).toBe(true);
    });

    it('handles very small but non-zero balance for non-native tokens', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0.000000001', false),
      );

      expect(result.current).toBe(true);
    });

    it('correctly identifies native token without chainId in token object', () => {
      const tokenWithoutChainId = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
      } as BridgeToken;

      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(tokenWithoutChainId.address);
      mockUseSelector.mockReturnValue(false); // stxEnabled = false, isGaslessSwapEnabled = false

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(tokenWithoutChainId, '100', false),
      );

      // Should return false (native + no gasless + no sponsored + no stx)
      expect(result.current).toBe(false);
    });
  });

  describe('Hook parameter validation', () => {
    it('uses useTokenAddress hook to get token address', () => {
      const customToken = {
        ...mockToken,
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      };
      mockUseTokenAddress.mockReturnValue(customToken.address);

      renderHook(() => useShouldRenderMaxOption(customToken, '100', false));

      expect(mockUseTokenAddress).toHaveBeenCalledWith(customToken);
    });

    it('checks if token address is native using isNativeAddress', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      mockUseTokenAddress.mockReturnValue(tokenAddress);
      mockIsNativeAddress.mockReturnValue(false);

      renderHook(() => useShouldRenderMaxOption(mockToken, '100', false));

      expect(mockIsNativeAddress).toHaveBeenCalledWith(tokenAddress);
    });

    it('calls selectIsGaslessSwapEnabled with correct chainId', () => {
      const tokenWithChainId = {
        ...mockToken,
        chainId: '0xa' as `0x${string}`, // Optimism
      };
      mockUseSelector.mockReturnValue(true);

      renderHook(() =>
        useShouldRenderMaxOption(tokenWithChainId, '100', false),
      );

      // Verify useSelector was called (it uses selectIsGaslessSwapEnabled)
      expect(mockUseSelector).toHaveBeenCalled();
    });
  });

  describe('Default parameter values', () => {
    it('uses false as default for isQuoteSponsored when not provided', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
      let callCount = 0;
      mockUseSelector.mockImplementation(() => {
        callCount++;
        // First call: isGaslessSwapEnabled = false
        // Second call: stxEnabled = true
        return callCount === 2;
      });

      // Call without isQuoteSponsored parameter
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(nativeToken, '100'),
      );

      // Should return false (native + stx=true + gasless=false + sponsored=false)
      expect(result.current).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('returns correct value for typical non-native ERC20 token', () => {
      const usdcToken: BridgeToken = {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        chainId: CHAIN_IDS.MAINNET,
      };

      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(usdcToken.address);
      mockUseSelector.mockReturnValue(false); // Everything disabled

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(usdcToken, '1000', false),
      );

      // Non-native tokens always show max (even with everything disabled)
      expect(result.current).toBe(true);
    });

    it('returns correct value for native ETH with gasless swap enabled', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
      mockUseSelector.mockReturnValue(true); // stxEnabled=true, gasless=true

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(nativeToken, '5.5', false),
      );

      expect(result.current).toBe(true);
    });

    it('returns correct value for native ETH with sponsored quote', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
      let callCount = 0;
      mockUseSelector.mockImplementation(() => {
        callCount++;
        // First call: isGaslessSwapEnabled = false
        // Second call: stxEnabled = true
        return callCount === 2;
      });

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(nativeToken, '2.25', true),
      );

      expect(result.current).toBe(true);
    });

    it('returns correct value for native ETH without gasless or sponsored but stx enabled', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
      let callCount = 0;
      mockUseSelector.mockImplementation(() => {
        callCount++;
        // First call: isGaslessSwapEnabled = false
        // Second call: stxEnabled = true
        return callCount === 2;
      });

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(nativeToken, '10', false),
      );

      // Should be false (native + stx=true + gasless=false + sponsored=false)
      expect(result.current).toBe(false);
    });
  });

  describe('Boundary conditions', () => {
    it('handles balance exactly equal to zero', () => {
      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0.00000', false),
      );

      expect(result.current).toBe(false);
    });

    it('handles extremely small but non-zero balance', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(mockToken, '0.00000001', false),
      );

      expect(result.current).toBe(true);
    });

    it('handles extremely large balance', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(
          mockToken,
          '999999999999999999999999999.999999',
          false,
        ),
      );

      expect(result.current).toBe(true);
    });

    it('handles balance with many decimal places', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseTokenAddress.mockReturnValue(mockToken.address);

      const { result } = renderHook(() =>
        useShouldRenderMaxOption(
          mockToken,
          '123.456789012345678901234567',
          false,
        ),
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Truth table - Native token with all combinations', () => {
    beforeEach(() => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseTokenAddress.mockReturnValue(nativeToken.address);
    });

    const truthTable = [
      { stxEnabled: true, gasless: true, sponsored: false, expected: true },
      { stxEnabled: true, gasless: false, sponsored: true, expected: true },
      { stxEnabled: true, gasless: true, sponsored: true, expected: true },
      { stxEnabled: true, gasless: false, sponsored: false, expected: false },
      { stxEnabled: false, gasless: true, sponsored: false, expected: false },
      { stxEnabled: false, gasless: false, sponsored: true, expected: false },
      { stxEnabled: false, gasless: true, sponsored: true, expected: false },
      { stxEnabled: false, gasless: false, sponsored: false, expected: false },
    ];

    truthTable.forEach(({ stxEnabled, gasless, sponsored, expected }) => {
      it(`stxEnabled=${stxEnabled}, gasless=${gasless}, sponsored=${sponsored} → returns ${expected}`, () => {
        let callCount = 0;
        mockUseSelector.mockImplementation(() => {
          callCount++;
          // First call: isGaslessSwapEnabled (line 12 in hook)
          // Second call: stxEnabled (line 15 in hook)
          if (callCount === 1) {
            return gasless;
          }
          return stxEnabled;
        });

        const { result } = renderHook(() =>
          useShouldRenderMaxOption(nativeToken, '100', sponsored),
        );

        expect(result.current).toBe(expected);
      });
    });
  });
});
