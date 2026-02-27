import { renderHook } from '@testing-library/react-hooks';
import { useShouldRenderGasSponsoredBanner } from './index';
import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSelector } from 'react-redux';

jest.mock('../useIsNetworkGasSponsored');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseIsNetworkGasSponsored =
  useIsNetworkGasSponsored as jest.MockedFunction<
    typeof useIsNetworkGasSponsored
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useShouldRenderGasSponsoredBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(null);
    mockUseIsNetworkGasSponsored.mockReturnValue(false);
  });

  describe('returns true when quoteGasSponsored is true', () => {
    it('returns true when quoteGasSponsored is true regardless of other conditions', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when quoteGasSponsored is true with insufficient balance and network not sponsored', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when quoteGasSponsored is true with sufficient balance and network sponsored', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('returns true when insufficient balance and network is sponsored', () => {
    it('returns true when user has insufficient balance and network is sponsored', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('returns false', () => {
    it('returns false when quoteGasSponsored is false and balance is sufficient', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when insufficient balance but network is not sponsored', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when sufficient balance but network is sponsored', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when quoteGasSponsored is undefined and balance is sufficient', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('truth table for all conditions', () => {
    it('quoteGasSponsored=true, hasInsufficientBalance=true, isNetworkGasSponsored=true → returns true', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: true,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('quoteGasSponsored=true, hasInsufficientBalance=true, isNetworkGasSponsored=false → returns true', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: true,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('quoteGasSponsored=true, hasInsufficientBalance=false, isNetworkGasSponsored=true → returns true', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('quoteGasSponsored=true, hasInsufficientBalance=false, isNetworkGasSponsored=false → returns true', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('quoteGasSponsored=false, hasInsufficientBalance=true, isNetworkGasSponsored=true → returns true', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('quoteGasSponsored=false, hasInsufficientBalance=true, isNetworkGasSponsored=false → returns false', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('quoteGasSponsored=false, hasInsufficientBalance=false, isNetworkGasSponsored=true → returns false', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('quoteGasSponsored=false, hasInsufficientBalance=false, isNetworkGasSponsored=false → returns false', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles undefined quoteGasSponsored as false', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          hasInsufficientBalance: false,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns true when quoteGasSponsored is undefined but insufficient balance with network sponsored', () => {
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          hasInsufficientBalance: true,
        }),
      );

      expect(result.current).toBe(true);
    });
  });

  describe('selector integration', () => {
    it('calls useIsNetworkGasSponsored with sourceToken chainId', () => {
      // Arrange
      const sourceToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1',
      };

      mockUseSelector.mockReturnValue(sourceToken);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(mockUseIsNetworkGasSponsored).toHaveBeenCalledWith('0x1');
    });

    it('calls useIsNetworkGasSponsored with undefined when sourceToken is null', () => {
      // Arrange
      mockUseSelector.mockReturnValue(null);
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(mockUseIsNetworkGasSponsored).toHaveBeenCalledWith(undefined);
    });
  });

  describe('realistic scenarios', () => {
    it('shows banner for gasless quote with sufficient balance', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('shows banner when user has insufficient balance on sponsored network', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('does not show banner for regular quote with sufficient balance', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('does not show banner when insufficient balance on non-sponsored network', () => {
      // Arrange
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });
});
