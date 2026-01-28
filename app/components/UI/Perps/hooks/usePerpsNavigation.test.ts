import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { usePerpsNavigation } from './usePerpsNavigation';
import { usePerpsTrading } from './usePerpsTrading';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockDepositWithOrder = jest.fn();
jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(),
}));

describe('usePerpsNavigation', () => {
  const mockNavigate = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockGoBack = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
    typeof usePerpsTrading
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockDepositWithOrder.mockResolvedValue({ result: Promise.resolve('') });
    mockUsePerpsTrading.mockReturnValue({
      depositWithOrder: mockDepositWithOrder,
    } as Partial<ReturnType<typeof usePerpsTrading>> as ReturnType<
      typeof usePerpsTrading
    >);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
    } as Partial<ReturnType<typeof useNavigation>> as ReturnType<
      typeof useNavigation
    >);
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ACTIVITY, {
        redirectToPerpsTransactions: true,
        showBackButton: true,
      });
    });

    it('navigates to rewards', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToRewards();

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

    it('navigates to order screen with direction and asset', async () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'long' as const, asset: 'BTC' };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params,
        );
      });
    });

    it('navigates to tutorial without params', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToTutorial();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.TUTORIAL,
        undefined,
      );
    });

    it('navigates to tutorial with params', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { isFromDeeplink: true };

      result.current.navigateToTutorial(params);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, params);
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
