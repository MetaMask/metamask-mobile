import { renderHook } from '@testing-library/react-hooks';
import { useShouldRenderGasSponsoredBanner } from './index';
import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useIsHardwareWalletForBridge } from '../useIsHardwareWalletForBridge';
import { useSelector } from 'react-redux';
import {
  selectSourceToken,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';

jest.mock('../useIsNetworkGasSponsored');
jest.mock('../useIsHardwareWalletForBridge');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseIsNetworkGasSponsored =
  useIsNetworkGasSponsored as jest.MockedFunction<
    typeof useIsNetworkGasSponsored
  >;
const mockUseIsHardwareWalletForBridge =
  useIsHardwareWalletForBridge as jest.MockedFunction<
    typeof useIsHardwareWalletForBridge
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const SOURCE_CHAIN_ID = '0x1';
const SAME_CHAIN_DEST_CHAIN_ID = '0x1';
const DIFFERENT_DEST_CHAIN_ID = '0x89';

const buildToken = (chainId: string | undefined) =>
  chainId
    ? {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'TKN',
        decimals: 18,
        chainId,
      }
    : null;

const mockTokens = ({
  sourceChainId,
  destChainId,
}: {
  sourceChainId?: string;
  destChainId?: string;
}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSourceToken) return buildToken(sourceChainId);
    if (selector === selectDestToken) return buildToken(destChainId);
    return null;
  });
};

describe('useShouldRenderGasSponsoredBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokens({});
    mockUseIsNetworkGasSponsored.mockReturnValue(false);
    mockUseIsHardwareWalletForBridge.mockReturnValue(false);
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
    it('returns true when user has insufficient balance and network is sponsored on a same-chain swap', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('returns false on a cross-chain bridge with insufficient balance even on a sponsored source network', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: DIFFERENT_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

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

  describe('returns false', () => {
    it('returns false when quote is sponsored but source account is a hardware wallet', () => {
      // Arrange
      mockUseIsHardwareWalletForBridge.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: true,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when insufficient balance and network is sponsored but source account is a hardware wallet', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);
      mockUseIsHardwareWalletForBridge.mockReturnValue(true);

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
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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
    it('quoteGasSponsored=true, hasInsufficientBalance=true, isNetworkGasSponsored=true, isSameChain=true → returns true', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

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

    it('quoteGasSponsored=true, hasInsufficientBalance=true, isNetworkGasSponsored=false, isSameChain=true → returns true', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=true, hasInsufficientBalance=false, isNetworkGasSponsored=true, isSameChain=true → returns true', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=true, hasInsufficientBalance=false, isNetworkGasSponsored=false, isSameChain=true → returns true', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=false, hasInsufficientBalance=true, isNetworkGasSponsored=true, isSameChain=true → returns true', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=false, hasInsufficientBalance=true, isNetworkGasSponsored=true, isSameChain=false → returns false', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: DIFFERENT_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

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

    it('quoteGasSponsored=false, hasInsufficientBalance=true, isNetworkGasSponsored=false, isSameChain=true → returns false', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=false, hasInsufficientBalance=false, isNetworkGasSponsored=true, isSameChain=true → returns false', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('quoteGasSponsored=false, hasInsufficientBalance=false, isNetworkGasSponsored=false, isSameChain=true → returns false', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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
  });

  describe('edge cases', () => {
    it('handles undefined quoteGasSponsored as false', () => {
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

    it('returns true when quoteGasSponsored is undefined but insufficient balance with same-chain sponsored network', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: undefined,
          hasInsufficientBalance: true,
        }),
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('selector integration', () => {
    it('calls useIsNetworkGasSponsored with sourceToken chainId', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(false);

      // Act
      renderHook(() =>
        useShouldRenderGasSponsoredBanner({
          quoteGasSponsored: false,
          hasInsufficientBalance: false,
        }),
      );

      // Assert
      expect(mockUseIsNetworkGasSponsored).toHaveBeenCalledWith(
        SOURCE_CHAIN_ID,
      );
    });

    it('calls useIsNetworkGasSponsored with undefined when sourceToken is null', () => {
      // Arrange
      mockTokens({});
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

    it('shows banner when user has insufficient balance on a same-chain sponsored swap', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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

    it('does not show banner on a cross-chain bridge with insufficient balance, even on a sponsored source network', () => {
      // Arrange
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: DIFFERENT_DEST_CHAIN_ID,
      });
      mockUseIsNetworkGasSponsored.mockReturnValue(true);

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
      mockTokens({
        sourceChainId: SOURCE_CHAIN_ID,
        destChainId: SAME_CHAIN_DEST_CHAIN_ID,
      });
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
