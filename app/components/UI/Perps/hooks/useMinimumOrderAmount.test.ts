import { renderHook } from '@testing-library/react-hooks';
import { useMinimumOrderAmount } from './useMinimumOrderAmount';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';

// Mock the dependencies
jest.mock('./usePerpsMarketData');
jest.mock('./usePerpsNetwork');

describe('useMinimumOrderAmount', () => {
  const mockUsePerpsMarketData = usePerpsMarketData as jest.MockedFunction<
    typeof usePerpsMarketData
  >;
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;

  beforeEach(() => {
    jest.clearAllMocks();
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
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'ETH' }),
    );

    expect(result.current.minimumOrderAmount).toBe(6); // Mainnet default
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
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'SOL' }),
    );

    expect(result.current.minimumOrderAmount).toBe(11); // Testnet default
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle loading state', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'BTC' }),
    );

    expect(result.current.minimumOrderAmount).toBe(6); // Falls back to default
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load market data';
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: false,
      error: errorMessage,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'BTC' }),
    );

    expect(result.current.minimumOrderAmount).toBe(6); // Falls back to default
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle null market data', () => {
    mockUsePerpsMarketData.mockReturnValue({
      marketData: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { result } = renderHook(() =>
      useMinimumOrderAmount({ asset: 'XYZ' }),
    );

    expect(result.current.minimumOrderAmount).toBe(11); // Testnet default
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
