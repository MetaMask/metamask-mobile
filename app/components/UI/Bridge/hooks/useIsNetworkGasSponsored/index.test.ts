import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsNetworkGasSponsored } from './index';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { Hex } from '@metamask/utils';

jest.mock('../../../../../selectors/featureFlagController/gasFeesSponsored');

const mockGetGasFeesSponsoredNetworkEnabled =
  getGasFeesSponsoredNetworkEnabled as jest.MockedFunction<
    typeof getGasFeesSponsoredNetworkEnabled
  >;

describe('useIsNetworkGasSponsored', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns false', () => {
    it('returns false when chainId is undefined', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => false);

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored(undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when gasFeesSponsoredNetworkEnabled is undefined', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(
        undefined as unknown as (chainId: string) => boolean,
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x1' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when network is not sponsored', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0x89' // Only Polygon is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x1' as Hex), // Ethereum mainnet
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when both chainId and gasFeesSponsoredNetworkEnabled are undefined', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(
        undefined as unknown as (chainId: string) => boolean,
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored(undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('returns true', () => {
    it('returns true when network is sponsored for Ethereum mainnet', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0x1' // Ethereum mainnet is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x1' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when network is sponsored for Polygon', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0x89' // Polygon is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x89' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true when network is sponsored for Optimism', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0xa' // Optimism is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0xa' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('returns true for Solana when sponsored', () => {
      // Arrange
      const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) => chainId === solanaChainId);

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored(solanaChainId),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('multiple networks sponsored', () => {
    it('returns true when multiple networks are sponsored', () => {
      // Arrange
      const sponsoredNetworks = ['0x1', '0x89', '0xa'];
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) => sponsoredNetworks.includes(chainId));

      // Act & Assert for each network
      const ethereumResult = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x1' as Hex),
        { state: {} },
      );
      expect(ethereumResult.result.current).toBe(true);

      const polygonResult = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x89' as Hex),
        { state: {} },
      );
      expect(polygonResult.result.current).toBe(true);

      const optimismResult = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0xa' as Hex),
        { state: {} },
      );
      expect(optimismResult.result.current).toBe(true);
    });

    it('returns false for unsupported network when multiple networks are sponsored', () => {
      // Arrange
      const sponsoredNetworks = ['0x1', '0x89', '0xa'];
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) => sponsoredNetworks.includes(chainId));

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x38' as Hex), // BSC not sponsored
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('different networks', () => {
    it('correctly identifies Arbitrum as sponsored', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0xa4b1' // Arbitrum is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0xa4b1' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(true);
    });

    it('correctly identifies Base as not sponsored', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue((chainId) =>
         chainId === '0x1' // Only Ethereum is sponsored
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x2105' as Hex), // Base
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty string chainId', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => true);

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored(''),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });

    it('handles null gasFeesSponsoredNetworkEnabled function', () => {
      // Arrange
      mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(
        null as unknown as (chainId: string) => boolean,
      );

      // Act
      const { result } = renderHookWithProvider(
        () => useIsNetworkGasSponsored('0x1' as Hex),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe(false);
    });
  });
});
