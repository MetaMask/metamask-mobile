import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { usePerpsActions } from './usePerpsActions';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import { useIsPerpsProModeActive } from '../../Perps/utils/perpsModeSwitch';
import { usePerpsScreenVsBottomSheetAbTest } from '../../Perps/hooks/usePerpsScreenVsBottomSheetAbTest';
import Routes from '../../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { useTokenAssetDetails } from '../queries/tokenAssetQuery';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../queries/tokenAssetQuery', () => ({
  useTokenAssetDetails: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../Perps/hooks/usePerpsMarketForAsset', () => ({
  usePerpsMarketForAsset: jest.fn(),
}));

jest.mock('../../Perps/utils/perpsModeSwitch', () => ({
  useIsPerpsProModeActive: jest.fn(),
}));

jest.mock('../../Perps/hooks/usePerpsScreenVsBottomSheetAbTest', () => ({
  usePerpsScreenVsBottomSheetAbTest: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = jest.mocked(useNavigation);
const mockUsePerpsMarketForAsset = jest.mocked(usePerpsMarketForAsset);
const mockUseTokenAssetDetails = jest.mocked(useTokenAssetDetails);
const mockUseSelector = jest.mocked(useSelector);
let mockBasicFunctionalityEnabled = true;
const mockUseIsPerpsProModeActive = jest.mocked(useIsPerpsProModeActive);
const mockUsePerpsScreenVsBottomSheetAbTest = jest.mocked(
  usePerpsScreenVsBottomSheetAbTest,
);

describe('usePerpsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsPerpsProModeActive.mockReturnValue(false);
    mockUsePerpsScreenVsBottomSheetAbTest.mockReturnValue({
      useBottomSheet: false,
    });
    mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
    mockBasicFunctionalityEnabled = true;
    mockUseSelector.mockImplementation((selector) =>
      selector === selectBasicFunctionalityEnabled
        ? mockBasicFunctionalityEnabled
        : true,
    );
    mockUseTokenAssetDetails.mockReturnValue({
      asset: null,
      isLoading: false,
      isError: false,
    });
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
      }),
    });
  });

  it('opens the Trade sheet over Token Details in the bottom sheet variant', () => {
    // Arrange
    mockUsePerpsScreenVsBottomSheetAbTest.mockReturnValue({
      useBottomSheet: true,
    });
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

    const { result } = renderHook(() =>
      usePerpsActions({ symbol: 'ETH', fromTokenDetails: true }),
    );

    // Act
    result.current.handlePerpsAction?.('long');

    // Assert
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.ORDER_REDIRECT,
      params: {
        direction: 'long',
        asset: 'ETH',
        useBottomSheet: true,
        stayOnCurrentScreen: true,
      },
    });
  });

  it('reads the bottom sheet assignment without tracking exposure', () => {
    // Arrange
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
      isLoading: false,
      error: null,
    });

    // Act
    renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Assert
    expect(mockUsePerpsScreenVsBottomSheetAbTest).toHaveBeenCalledWith({
      trackExposure: false,
    });
  });

  it('opens the Pro market with the side preselected while Pro mode is active', () => {
    // Arrange
    mockUseIsPerpsProModeActive.mockReturnValue(true);
    const marketData = {
      symbol: 'ETH',
      name: 'ETH',
      maxLeverage: '50x',
      price: '',
      change24h: '',
      change24hPercent: '',
      volume: '',
    };
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: true,
      marketData,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => usePerpsActions({ symbol: 'ETH' }));

    // Act
    result.current.handlePerpsAction?.('short');

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: marketData,
        direction: 'short',
      }),
    });
  });

  it('passes an empty symbol to usePerpsMarketForAsset when symbol is null', () => {
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
    expect(mockUsePerpsMarketForAsset).toHaveBeenCalledWith('', false);
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
  describe('RWA tokens', () => {
    const noMarket = {
      hasPerpsMarket: false,
      marketData: null,
      isLoading: false,
      error: null,
    };
    const robinhoodMsft = {
      address: '0x1111111111111111111111111111111111111111',
      chainId: '0x1237',
    };

    beforeEach(() => {
      mockUsePerpsMarketForAsset.mockReturnValue(noMarket);
    });

    it('matches HIP-3 markets by the rwaData ticker fetched for the token', () => {
      mockUseTokenAssetDetails.mockReturnValue({
        asset: { rwaData: { ticker: 'MSFT' } } as never,
        isLoading: false,
        isError: false,
      });

      renderHook(() =>
        usePerpsActions({ symbol: 'MSFT', token: robinhoodMsft }),
      );

      expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(
        expect.stringContaining('0x1111111111111111111111111111111111111111'),
        expect.anything(),
      );
      expect(mockUsePerpsMarketForAsset).toHaveBeenLastCalledWith('MSFT', true);
    });

    it('uses exact symbol matching when the token has no rwaData', () => {
      renderHook(() =>
        usePerpsActions({ symbol: 'AAPL', token: robinhoodMsft }),
      );

      expect(mockUsePerpsMarketForAsset).toHaveBeenLastCalledWith(
        'AAPL',
        false,
      );
    });

    it('skips the rwaData fetch when basic functionality is off', () => {
      mockBasicFunctionalityEnabled = false;

      renderHook(() =>
        usePerpsActions({ symbol: 'MSFT', token: robinhoodMsft }),
      );

      expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(
        null,
        expect.anything(),
      );
    });
  });
});
