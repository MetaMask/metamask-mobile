import { renderHook } from '@testing-library/react-hooks';
import { useShouldRenderGasSponsoredBanner } from './index';
import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useSelector } from 'react-redux';
import { BigNumber } from 'ethers';

jest.mock('../useIsNetworkGasSponsored');
jest.mock('../useInsufficientBalance');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseIsNetworkGasSponsored =
  useIsNetworkGasSponsored as jest.MockedFunction<
    typeof useIsNetworkGasSponsored
  >;
const mockUseIsInsufficientBalance =
  useIsInsufficientBalance as jest.MockedFunction<
    typeof useIsInsufficientBalance
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useShouldRenderGasSponsoredBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(null);
    mockUseIsInsufficientBalance.mockReturnValue(false);
    mockUseIsNetworkGasSponsored.mockReturnValue(false);
  });

  describe('returns true when quoteGasSponsored is true', () => {
    it('returns true when quoteGasSponsored is true regardless of other conditions', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when quoteGasSponsored is true with insufficient balance and network not sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '1',
        atomicBalance: BigNumber.from('1000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when quoteGasSponsored is true with sufficient balance and network sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const latestSourceBalance = {
        displayBalance: '100',
        atomicBalance: BigNumber.from('100000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('returns true when insufficient balance and network is sponsored', () => {
    it('returns true when user has insufficient balance and network is sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const latestSourceBalance = {
        displayBalance: '0.5',
        atomicBalance: BigNumber.from('500000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('returns false', () => {
    it('returns false when quoteGasSponsored is false and balance is sufficient', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when insufficient balance but network is not sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '0.5',
        atomicBalance: BigNumber.from('500000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when sufficient balance but network is sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when quoteGasSponsored is undefined and balance is sufficient', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('balance parameter handling', () => {
    it('passes atomicBalance to useIsInsufficientBalance correctly', () => {
      // Arrange
      const latestSourceBalance = {
        displayBalance: '5.5',
        atomicBalance: BigNumber.from('5500000000000000000'),
      };

      mockUseSelector
        .mockReturnValueOnce('5.5') // sourceAmount
        .mockReturnValueOnce({
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'TEST',
          decimals: 18,
          chainId: '0x1',
        }); // sourceToken

      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: {
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'TEST',
          decimals: 18,
          chainId: '0x1',
        },
        latestAtomicBalance: latestSourceBalance.atomicBalance,
      });
    });

    it('handles undefined latestSourceBalance atomicBalance', () => {
      // Arrange
      const latestSourceBalance = {
        displayBalance: '5.5',
        atomicBalance: undefined,
      };

      mockUseSelector.mockReturnValueOnce('5.5').mockReturnValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'TEST',
        decimals: 18,
        chainId: '0x1',
      });

      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: {
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'TEST',
          decimals: 18,
          chainId: '0x1',
        },
        latestAtomicBalance: undefined,
      });
    });

    it('handles undefined latestSourceBalance', () => {
      // Arrange
      mockUseSelector.mockReturnValueOnce('5.5').mockReturnValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'TEST',
        decimals: 18,
        chainId: '0x1',
      });

      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance: undefined,
        }),
      );

      // Assert
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: {
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'TEST',
          decimals: 18,
          chainId: '0x1',
        },
        latestAtomicBalance: undefined,
      });
    });
  });

  describe('truth table for all conditions', () => {
    const truthTable = [
      {
        quoteGasSponsored: true,
        insufficientBal: true,
        isNetworkGasSponsored: true,
        expected: true,
      },
      {
        quoteGasSponsored: true,
        insufficientBal: true,
        isNetworkGasSponsored: false,
        expected: true,
      },
      {
        quoteGasSponsored: true,
        insufficientBal: false,
        isNetworkGasSponsored: true,
        expected: true,
      },
      {
        quoteGasSponsored: true,
        insufficientBal: false,
        isNetworkGasSponsored: false,
        expected: true,
      },
      {
        quoteGasSponsored: false,
        insufficientBal: true,
        isNetworkGasSponsored: true,
        expected: true,
      },
      {
        quoteGasSponsored: false,
        insufficientBal: true,
        isNetworkGasSponsored: false,
        expected: false,
      },
      {
        quoteGasSponsored: false,
        insufficientBal: false,
        isNetworkGasSponsored: true,
        expected: false,
      },
      {
        quoteGasSponsored: false,
        insufficientBal: false,
        isNetworkGasSponsored: false,
        expected: false,
      },
    ];

    truthTable.forEach(
      ({
        quoteGasSponsored,
        insufficientBal,
        isNetworkGasSponsored,
        expected,
      }) => {
        it(`quoteGasSponsored=${quoteGasSponsored}, insufficientBal=${insufficientBal}, isNetworkGasSponsored=${isNetworkGasSponsored} → returns ${expected}`, () => {
          // Arrange
          mockUseIsInsufficientBalance.mockReturnValue(insufficientBal);
          mockUseIsNetworkGasSponsored.mockReturnValue(isNetworkGasSponsored);

          const latestSourceBalance = {
            displayBalance: '10',
            atomicBalance: BigNumber.from('10000000000000000000'),
          };

          // Act
          const { result } = renderHook(() =>
            useShouldRenderGasSponsoredBanner({
              quoteGasSponsored,
              latestSourceBalance,
            }),
          );

          // Assert
          expect(result.current).toBe(expected);
        });
      },
    );
  });

  describe('edge cases', () => {
    it('handles undefined quoteGasSponsored as false', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns true when quoteGasSponsored is undefined but insufficient balance with network sponsored', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const latestSourceBalance = {
        displayBalance: '0.1',
        atomicBalance: BigNumber.from('100000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('selector integration', () => {
    it('calls useIsInsufficientBalance with sourceAmount from selector', () => {
      // Arrange
      const sourceAmount = '50.25';
      const sourceToken = {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        chainId: '0x1',
      };

      mockUseSelector
        .mockReturnValueOnce(sourceAmount)
        .mockReturnValueOnce(sourceToken);

      const latestSourceBalance = {
        displayBalance: '100',
        atomicBalance: BigNumber.from('100000000'),
      };

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: sourceAmount,
        token: sourceToken,
        latestAtomicBalance: latestSourceBalance.atomicBalance,
      });
    });

    it('calls useIsInsufficientBalance with sourceToken from selector', () => {
      // Arrange
      const sourceAmount = '1.5';
      const sourceToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1',
      };

      mockUseSelector
        .mockReturnValueOnce(sourceAmount)
        .mockReturnValueOnce(sourceToken);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: sourceAmount,
        token: sourceToken,
        latestAtomicBalance: latestSourceBalance.atomicBalance,
      });
    });

    it('calls useIsNetworkGasSponsored without chainId parameter', () => {
      // Arrange
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '10',
        atomicBalance: BigNumber.from('10000000000000000000'),
      };

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(mockUseIsNetworkGasSponsored).toHaveBeenCalledWith();
    });
  });

  describe('realistic scenarios', () => {
    it('shows banner for gasless quote with sufficient balance', () => {
      // Arrange - User has enough balance, quote is gasless
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '100',
        atomicBalance: BigNumber.from('100000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true, // Quote is gasless/sponsored
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('shows banner when user has insufficient balance on sponsored network', () => {
      // Arrange - User doesn't have enough, but network offers sponsorship
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const latestSourceBalance = {
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('1000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('does not show banner for regular quote with sufficient balance', () => {
      // Arrange - Normal scenario, user has balance, no sponsorship needed
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '50',
        atomicBalance: BigNumber.from('50000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('does not show banner when insufficient balance on non-sponsored network', () => {
      // Arrange - User doesn't have enough and network doesn't offer sponsorship
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const latestSourceBalance = {
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('1000000000000000'),
      };

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          latestSourceBalance,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });
});
