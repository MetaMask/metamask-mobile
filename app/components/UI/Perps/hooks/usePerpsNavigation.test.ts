import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { usePerpsNavigation } from './usePerpsNavigation';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('usePerpsNavigation', () => {
  const mockNavigate = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockGoBack = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
    } as Partial<ReturnType<typeof useNavigation>> as ReturnType<typeof useNavigation>);
    mockUseSelector.mockReturnValue(false); // isRewardsEnabled = false
  });

  describe('Main App Navigation', () => {
    it('navigates to wallet view', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToWallet();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });

    it('navigates to browser view', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToBrowser();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
      });
    });

    it('navigates to actions modal', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToActions();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WALLET_ACTIONS,
      });
    });

    it('navigates to activity view', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToActivity();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('navigates to settings when rewards disabled', () => {
      mockUseSelector.mockReturnValue(false);
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToRewardsOrSettings();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
        screen: 'Settings',
      });
    });

    it('navigates to rewards when rewards enabled', () => {
      mockUseSelector.mockReturnValue(true);
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToRewardsOrSettings();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });

  describe('Perps-Specific Navigation', () => {
    it('navigates to market details without source', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const mockMarket = { symbol: 'BTC' } as Partial<
        Parameters<typeof result.current.navigateToMarketDetails>[0]
      >;

      result.current.navigateToMarketDetails(
        mockMarket as Parameters<
          typeof result.current.navigateToMarketDetails
        >[0],
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MARKET_DETAILS, {
        market: mockMarket,
        source: undefined,
      });
    });

    it('navigates to market details with source', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const mockMarket = { symbol: 'ETH' } as Partial<
        Parameters<typeof result.current.navigateToMarketDetails>[0]
      >;

      result.current.navigateToMarketDetails(
        mockMarket as Parameters<
          typeof result.current.navigateToMarketDetails
        >[0],
        'home_screen',
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MARKET_DETAILS, {
        market: mockMarket,
        source: 'home_screen',
      });
    });

    it('navigates to perps home without source', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToHome();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PERPS_HOME, {
        source: undefined,
      });
    });

    it('navigates to perps home with source', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToHome('market_list');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PERPS_HOME, {
        source: 'market_list',
      });
    });

    it('navigates to market list without params', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToMarketList();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.MARKET_LIST,
        undefined,
      );
    });

    it('navigates to market list with params', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { source: 'test', variant: 'full' as const };

      result.current.navigateToMarketList(params);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.MARKET_LIST,
        params,
      );
    });
  });

  describe('Utility Navigation', () => {
    it('navigates back when can go back', () => {
      mockCanGoBack.mockReturnValue(true);
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateBack();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not navigate back when cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateBack();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('returns canGoBack state', () => {
      mockCanGoBack.mockReturnValue(true);
      const { result } = renderHook(() => usePerpsNavigation());

      expect(result.current.canGoBack).toBe(true);
    });

    it('returns false when cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);
      const { result } = renderHook(() => usePerpsNavigation());

      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Handler Stability', () => {
    it('maintains stable function references', () => {
      const { result, rerender } = renderHook(() => usePerpsNavigation());

      const firstRenderHandlers = { ...result.current };
      rerender();
      const secondRenderHandlers = { ...result.current };

      // All handlers should be stable (same reference)
      expect(firstRenderHandlers.navigateToWallet).toBe(
        secondRenderHandlers.navigateToWallet,
      );
      expect(firstRenderHandlers.navigateToMarketDetails).toBe(
        secondRenderHandlers.navigateToMarketDetails,
      );
      expect(firstRenderHandlers.navigateBack).toBe(
        secondRenderHandlers.navigateBack,
      );
    });
  });
});
