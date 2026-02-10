import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { usePerpsActions } from './usePerpsActions';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../Perps/hooks/usePerpsMarketForAsset', () => ({
  usePerpsMarketForAsset: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = jest.mocked(useNavigation);
const mockUsePerpsMarketForAsset = jest.mocked(usePerpsMarketForAsset);

describe('usePerpsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
  });

  it('returns undefined handlePerpsAction when no market exists', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
      isLoading: false,
      error: null,
    });

    // Act
    const { result } = renderHook(() => usePerpsActions({ symbol: 'USDC' }));

    // Assert
    expect(result.current.handlePerpsAction).toBeUndefined();
    expect(result.current.hasPerpsMarket).toBe(false);
  });

  it('returns handlePerpsAction when market exists', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: true,
      marketData: {
        symbol: 'ETH',
        name: 'ETH',
        maxLeverage: '50x',
        price: '',
        change24h: '',
        change24hPercent: '',
        volume: '',
      },
      isLoading: false,
      error: null,
    });

    // Act
    const { result } = renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Assert
    expect(result.current.handlePerpsAction).toEqual(expect.any(Function));
    expect(result.current.hasPerpsMarket).toBe(true);
  });

  it('navigates to PerpsOrderRedirect with long direction', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: true,
      marketData: {
        symbol: 'ETH',
        name: 'ETH',
        maxLeverage: '50x',
        price: '',
        change24h: '',
        change24hPercent: '',
        volume: '',
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Act
    result.current.handlePerpsAction?.('long');

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.ORDER_REDIRECT,
      params: expect.objectContaining({
        direction: 'long',
        asset: 'ETH',
        source: 'asset_detail_screen',
      }),
    });
  });

  it('navigates to PerpsOrderRedirect with short direction', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: true,
      marketData: {
        symbol: 'BTC',
        name: 'BTC',
        maxLeverage: '40x',
        price: '',
        change24h: '',
        change24hPercent: '',
        volume: '',
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => usePerpsActions({ symbol: 'BTC' }));

    // Act
    result.current.handlePerpsAction?.('short');

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.ORDER_REDIRECT,
      params: expect.objectContaining({
        direction: 'short',
        asset: 'BTC',
        source: 'asset_detail_screen',
      }),
    });
  });

  it('passes null symbol through to usePerpsMarketForAsset', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
      isLoading: false,
      error: null,
    });

    // Act
    renderHook(() => usePerpsActions({ symbol: null }));

    // Assert
    expect(mockUsePerpsMarketForAsset).toHaveBeenCalledWith(null);
  });

  it('does not navigate when marketData is null even if called', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: true,
      marketData: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Act - handlePerpsAction is defined since hasPerpsMarket=true, but marketData is null
    // The internal navigateToOrder should bail early
    if (result.current.handlePerpsAction) {
      result.current.handlePerpsAction('long');
    }

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('forwards isLoading and error from usePerpsMarketForAsset', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
      isLoading: true,
      error: 'Network error',
    });

    // Act
    const { result } = renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });
});
