import { renderHook } from '@testing-library/react-hooks';
import { useMinimumOrderAmount } from './useMinimumOrderAmount';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsProvider } from './usePerpsProvider';

// Mock the dependencies
jest.mock('./usePerpsMarketData');
jest.mock('./usePerpsNetwork');
jest.mock('./usePerpsProvider');

describe('useMinimumOrderAmount', () => {
  const mockUsePerpsMarketData = usePerpsMarketData as jest.MockedFunction<
    typeof usePerpsMarketData
  >;
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;

  const mockUsePerpsProvider = usePerpsProvider as jest.Mock;
  // Only `orderCapabilities` is read; the rest of the hook result is unused.
  const mockOrderCapabilities = (
    orderCapabilities: ReturnType<typeof usePerpsProvider>['orderCapabilities'],
  ) => mockUsePerpsProvider.mockReturnValue({ orderCapabilities });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderCapabilities(null);
  });

  it("uses the venue's minimum order value from Core order capabilities", () => {
    // Arrange
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        name: 'ETH',
        szDecimals: 4,
        maxLeverage: 50,
        marginTableId: 1,
      },
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockOrderCapabilities({
      status: 'ready',
      providerId: 'lighter',
      supportedStrategies: [],
      orderLimits: { sizeDecimals: 4, minOrderNotionalUsd: 1 },
    });

    // Act
    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'ETH', providerId: 'lighter' }),
    );

    // Assert: not Hyperliquid's $10 default
    expect(result.current.minimumOrderAmount).toBe(1);
    expect(mockUsePerpsProvider).toHaveBeenCalledWith({
      symbol: 'ETH',
      providerId: 'lighter',
    });
  });

  it('should return market-specific minimum when available', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        name: 'BTC',
        szDecimals: 5,
        maxLeverage: 50,
        marginTableId: 1,
        minimumOrderSize: 25, // Market-specific minimum
      },
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'BTC' }),
    );

    expect(result.current.minimumOrderAmount).toBe(25);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return mainnet default when market data has no minimum', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        name: 'ETH',
        szDecimals: 4,
        maxLeverage: 50,
        marginTableId: 1,
        // No minimumOrderSize specified
      },
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'ETH' }),
    );

    expect(result.current.minimumOrderAmount).toBe(10); // Mainnet default ($10)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return testnet default when on testnet', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        name: 'SOL',
        szDecimals: 3,
        maxLeverage: 20,
        marginTableId: 2,
        // No minimumOrderSize specified
      },
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'SOL' }),
    );

    expect(result.current.minimumOrderAmount).toBe(10); // Testnet default ($10)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle loading state', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: true,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'BTC' }),
    );

    expect(result.current.minimumOrderAmount).toBe(10); // Falls back to default ($10)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load market data';
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: errorMessage,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'BTC' }),
    );

    expect(result.current.minimumOrderAmount).toBe(10); // Falls back to default ($10)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle null market data', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'XYZ' }),
    );

    expect(result.current.minimumOrderAmount).toBe(10); // Testnet default ($10)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return 0 when minimumOrderSize is explicitly 0', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        name: 'TEST',
        szDecimals: 2,
        maxLeverage: 10,
        marginTableId: 3,
        minimumOrderSize: 0, // Explicitly set to 0
      },
      isLoading: false,
      isProviderMetadataAvailable: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'TEST' }),
    );

    expect(result.current.minimumOrderAmount).toBe(0);
  });
});
