import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  PerpsMode,
  type PerpsActiveProviderMode,
  PERPS_EVENT_VALUE,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsNavigation } from './usePerpsNavigation';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsProvider } from './usePerpsProvider';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import Routes from '../../../../constants/navigation/Routes';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';
import { selectPerpsProModeEnabledFlag } from '../selectors/featureFlags';
import {
  selectPerpsMode,
  selectPerpsProvider,
} from '../selectors/perpsController';
import {
  failPerpsTradeSheetInteractiveTrace,
  startPerpsTradeSheetInteractiveTrace,
} from '../utils/perpsTradeSheetInteractiveTrace';
import { claimPrewarmedDepositOrder } from '../utils/prewarmedDepositOrder';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockDepositWithOrder = jest.fn();
const mockSwitchProvider = jest.fn();
const mockShowToast = jest.fn();
const mockTrack = jest.fn();
const mockWithPendingTransactionActiveAbTests = jest.fn(
  (_tests: unknown, fn: () => Promise<unknown>) => fn(),
);
const mockRegisterTransactionAbTestAttributionForIds = jest.fn();

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(),
}));

jest.mock('./usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../utils/perpsTradeSheetInteractiveTrace', () => ({
  startPerpsTradeSheetInteractiveTrace: jest.fn(),
  failPerpsTradeSheetInteractiveTrace: jest.fn(),
}));

jest.mock(
  '../../../../util/transactions/transaction-active-ab-test-attribution-registry',
  () => ({
    withPendingTransactionActiveAbTests: (
      tests: unknown,
      fn: () => Promise<unknown>,
    ) => mockWithPendingTransactionActiveAbTests(tests, fn),
    registerTransactionAbTestAttributionForIds: (
      ids: string[],
      tests: unknown,
    ) => mockRegisterTransactionAbTestAttributionForIds(ids, tests),
  }),
);

jest.mock('../utils/prewarmedDepositOrder', () => ({
  ...jest.requireActual('../utils/prewarmedDepositOrder'),
  claimPrewarmedDepositOrder: jest.fn(),
}));

describe('usePerpsNavigation', () => {
  const mockNavigate = jest.fn();
  const mockReset = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockGoBack = jest.fn();
  const mockDispatch = jest.fn();
  const mockGetState = jest.fn();
  let mockActiveProvider: PerpsActiveProviderMode | undefined;
  let mockSelectedAccountAddress: string | undefined;
  const mockClaimPrewarmedDepositOrder = jest.mocked(
    claimPrewarmedDepositOrder,
  );
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
    typeof usePerpsTrading
  >;
  const mockUsePerpsProvider = usePerpsProvider as jest.MockedFunction<
    typeof usePerpsProvider
  >;
  const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
    typeof usePerpsToasts
  >;
  const mockUsePerpsEventTracking =
    usePerpsEventTracking as jest.MockedFunction<typeof usePerpsEventTracking>;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveProvider = undefined;
    mockSelectedAccountAddress = '0xabc';
    mockClaimPrewarmedDepositOrder.mockReturnValue(undefined);
    mockCanGoBack.mockReturnValue(true);
    // Default to Pro mode inactive, matching the existing navigateToHome
    // assertions below which expect the Perps Home screen target.
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProModeEnabledFlag) return false;
      if (selector === selectPerpsMode) return PerpsMode.Lite;
      if (selector === selectPerpsProvider) return mockActiveProvider;
      if (selector === selectPerpsSelectedAccountAddress)
        return mockSelectedAccountAddress;
      return undefined;
    });
    mockDepositWithOrder.mockResolvedValue({ result: Promise.resolve('') });
    mockSwitchProvider.mockResolvedValue({
      success: true,
      providerId: 'hyperliquid',
    });
    mockUsePerpsTrading.mockReturnValue({
      depositWithOrder: mockDepositWithOrder,
    } as Partial<ReturnType<typeof usePerpsTrading>> as ReturnType<
      typeof usePerpsTrading
    >);
    mockUsePerpsProvider.mockReturnValue({
      switchProvider: mockSwitchProvider,
    } as Partial<ReturnType<typeof usePerpsProvider>> as ReturnType<
      typeof usePerpsProvider
    >);
    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: {
        accountManagement: {
          deposit: { error: {} },
          oneClickTrade: { txCreationFailed: {} },
        },
      },
    } as unknown as ReturnType<typeof usePerpsToasts>);
    mockUsePerpsEventTracking.mockReturnValue({
      track: mockTrack,
    });
    // Default to a navigator that doesn't own the Perps screens, so
    // navigateToMarketList takes the cross-stack `navigate(PERPS.ROOT)` path.
    mockGetState.mockReturnValue({ routeNames: [] });
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      dispatch: mockDispatch,
      getState: mockGetState,
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

    it('navigates to market details with transaction active A/B tests', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const mockMarket = { symbol: 'SOL' } as Partial<
        Parameters<typeof result.current.navigateToMarketDetails>[0]
      >;
      const transactionActiveAbTests = [
        {
          key: 'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
          value: 'treatment',
          key_value_pair:
            'homeTMCU725AbtestHomepagePerpsPillsEmptyState=treatment',
        },
      ];

      result.current.navigateToMarketDetails(
        mockMarket as Parameters<
          typeof result.current.navigateToMarketDetails
        >[0],
        'perp_markets',
        transactionActiveAbTests,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MARKET_DETAILS, {
        market: mockMarket,
        source: 'perp_markets',
        transactionActiveAbTests,
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

    it('resets the Perps stack to home instead of pushing it', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.resetToHome('market_list');

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.PERPS.PERPS_HOME,
            params: { source: 'market_list' },
          },
        ],
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to the default Pro market instead of home when Pro mode is active', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsProModeEnabledFlag) return true;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToHome('market_list');

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.MARKET_DETAILS,
        expect.objectContaining({
          market: expect.objectContaining({ symbol: 'BTC' }),
          source: 'market_list',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PERPS.PERPS_HOME,
        expect.anything(),
      );
    });

    it('navigates to market list through the Perps root from outside the stack', () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToMarketList();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: undefined,
      });
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('navigates to market list with params from outside the stack', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { source: 'test', variant: 'full' as const };

      result.current.navigateToMarketList(params);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params,
      });
    });

    it('pushes the market list when already inside the Perps stack', () => {
      // Arrange - navigate() would pop back to an existing market list entry,
      // animating backwards when the user reached this screen through it.
      mockGetState.mockReturnValue({
        routeNames: [Routes.PERPS.MARKET_LIST, Routes.PERPS.MARKET_DETAILS],
      });
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { source: 'perp_asset_screen' };

      // Act
      result.current.navigateToMarketList(params);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.push(Routes.PERPS.MARKET_LIST, params),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('pushes market list from header so details stay beneath the slide-up', () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { source: 'perp_asset_screen' };

      result.current.navigateToMarketListFromHeader(params);

      // Must push (not ROOT navigate) so MARKET_LIST → MARKET_DETAILS keeps
      // details under the picker; navigate() would pop back to the existing list.
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.push(Routes.PERPS.MARKET_LIST, {
          ...params,
          animation: 'slide_from_bottom',
          replaceOnSelect: true,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to order screen with direction and asset', async () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'long' as const, asset: 'BTC' };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          {
            ...params,
            showPerpsHeader:
              CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
          },
        );
      });
    });

    it('reuses a prewarmed transaction instead of creating one', async () => {
      mockClaimPrewarmedDepositOrder.mockReturnValue(
        Promise.resolve('prewarmed-tx'),
      );
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'long' as const, asset: 'BTC' };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          {
            ...params,
            showPerpsHeader:
              CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
          },
        );
      });
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
    });

    it('binds AB test attribution to the prewarmed transaction', async () => {
      mockClaimPrewarmedDepositOrder.mockReturnValue(
        Promise.resolve('prewarmed-tx'),
      );
      const transactionActiveAbTests = [{ key: 'test', value: 'treatment' }];
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'BTC',
        transactionActiveAbTests,
      });

      await waitFor(() => {
        expect(
          mockRegisterTransactionAbTestAttributionForIds,
        ).toHaveBeenCalledWith(['prewarmed-tx'], transactionActiveAbTests);
      });
    });

    it('claims for the order provider so a pending switch never reuses a prewarm', () => {
      // Active Lighter with an explicit Hyperliquid order is the case that has
      // to switch provider before depositing.
      mockActiveProvider = 'lighter';
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'BTC',
        providerId: 'hyperliquid',
      });

      expect(mockClaimPrewarmedDepositOrder).toHaveBeenCalledWith({
        accountAddress: '0xabc',
        providerId: 'hyperliquid',
      });
    });

    it('creates the transaction when claiming a prewarm fails', async () => {
      mockClaimPrewarmedDepositOrder.mockReturnValue(
        Promise.reject(new Error('prewarm gone')),
      );
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({ direction: 'long', asset: 'BTC' });

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('creates the transaction when no prewarm is available', async () => {
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({ direction: 'long', asset: 'BTC' });

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
      });
    });

    it('creates the transaction when no account address is available', async () => {
      mockSelectedAccountAddress = undefined;
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({ direction: 'long', asset: 'BTC' });

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
      });
      expect(mockClaimPrewarmedDepositOrder).not.toHaveBeenCalled();
    });

    it('switches to Lighter before routing an explicit order while aggregated', async () => {
      mockActiveProvider = 'aggregated';
      const { result } = renderHook(() => usePerpsNavigation());
      const params = {
        direction: 'long' as const,
        asset: 'ETH',
        providerId: 'lighter' as const,
        useBottomSheet: true,
      };

      result.current.navigateToOrder(params);

      expect(mockSwitchProvider).toHaveBeenCalledWith('lighter');
      expect(mockNavigate).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.BALANCE_ORDER,
          params,
        );
      });
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
      expect(startPerpsTradeSheetInteractiveTrace).not.toHaveBeenCalled();
    });

    it('switches a concrete provider before routing an explicit Lighter order', async () => {
      mockActiveProvider = 'hyperliquid';
      mockSwitchProvider.mockResolvedValueOnce({
        success: true,
        providerId: 'lighter',
      });
      const { result } = renderHook(() => usePerpsNavigation());
      const params = {
        direction: 'long' as const,
        asset: 'ETH',
        providerId: 'lighter' as const,
      };

      result.current.navigateToOrder(params);

      expect(mockNavigate).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockSwitchProvider).toHaveBeenCalledWith('lighter');
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.BALANCE_ORDER,
          params,
        );
      });
      expect(mockSwitchProvider.mock.invocationCallOrder[0]).toBeLessThan(
        mockNavigate.mock.invocationCallOrder[0],
      );
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
    });

    it('does not route an explicit Lighter order when provider switching fails', async () => {
      mockActiveProvider = 'aggregated';
      mockSwitchProvider.mockResolvedValueOnce({
        success: false,
        error: 'Provider switch failed',
      });
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'ETH',
        providerId: 'lighter',
      });

      await waitFor(() => {
        expect(mockSwitchProvider).toHaveBeenCalledWith('lighter');
        expect(mockShowToast).toHaveBeenCalledWith({});
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
    });

    it('preserves deposit routing for an aggregated order without providerId', async () => {
      mockActiveProvider = 'aggregated';
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'long' as const, asset: 'ETH' };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          expect.objectContaining(params),
        );
      });
      expect(mockSwitchProvider).not.toHaveBeenCalled();
    });

    it('uses the default provider without switching while aggregated', async () => {
      mockActiveProvider = 'aggregated';
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'ETH',
        providerId: 'hyperliquid',
      });

      await waitFor(() =>
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1),
      );
      expect(mockSwitchProvider).not.toHaveBeenCalled();
    });

    it('uses the explicit provider over a concrete active provider', async () => {
      mockActiveProvider = 'lighter';
      const { result } = renderHook(() => usePerpsNavigation());
      const params = {
        direction: 'short' as const,
        asset: 'ETH',
        providerId: 'hyperliquid' as const,
      };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockSwitchProvider).toHaveBeenCalledWith('hyperliquid');
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          expect.objectContaining(params),
        );
      });
      expect(mockSwitchProvider.mock.invocationCallOrder[0]).toBeLessThan(
        mockDepositWithOrder.mock.invocationCallOrder[0],
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PERPS.BALANCE_ORDER,
        expect.anything(),
      );
    });

    it('does not deposit or navigate when an explicit provider switch fails', async () => {
      mockActiveProvider = 'lighter';
      mockSwitchProvider.mockResolvedValueOnce({
        success: false,
        error: 'Provider switch failed',
      });
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'ETH',
        providerId: 'hyperliquid',
      });

      await waitFor(() => {
        expect(mockSwitchProvider).toHaveBeenCalledWith('hyperliquid');
        expect(mockShowToast).toHaveBeenCalledWith({});
      });
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not switch when the explicit provider matches the active provider', async () => {
      mockActiveProvider = 'hyperliquid';
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'ETH',
        providerId: 'hyperliquid',
      });

      await waitFor(() =>
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1),
      );
      expect(mockSwitchProvider).not.toHaveBeenCalled();
    });

    it('preserves direct routing for an active Lighter provider without providerId', () => {
      mockActiveProvider = 'lighter';
      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'short' as const, asset: 'ETH' };

      result.current.navigateToOrder(params);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.BALANCE_ORDER,
        params,
      );
      expect(mockDepositWithOrder).not.toHaveBeenCalled();
    });

    it('opens order confirmation as a headerless bottom sheet for treatment', async () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const params = {
        direction: 'long' as const,
        asset: 'SOL',
        useBottomSheet: true,
      };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          {
            ...params,
            useBottomSheet: true,
            showPerpsHeader: false,
          },
        );
      });
      expect(startPerpsTradeSheetInteractiveTrace).toHaveBeenCalledWith(
        PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      );
    });

    it('wraps order creation with transaction active A/B tests when provided', async () => {
      const { result } = renderHook(() => usePerpsNavigation());
      const transactionActiveAbTests = [
        {
          key: 'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
          value: 'control',
          key_value_pair:
            'homeTMCU725AbtestHomepagePerpsPillsEmptyState=control',
        },
      ];
      const params = {
        direction: 'long' as const,
        asset: 'BTC',
        transactionActiveAbTests,
      };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockWithPendingTransactionActiveAbTests).toHaveBeenCalledWith(
          transactionActiveAbTests,
          mockDepositWithOrder,
        );
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          expect.objectContaining({
            transactionActiveAbTests,
          }),
        );
      });
    });

    it('does not navigate when depositWithOrder rejects (e.g. user cancellation)', async () => {
      const rejectionError = new Error('User denied');
      mockDepositWithOrder.mockRejectedValue(rejectionError);

      const { result } = renderHook(() => usePerpsNavigation());
      const params = { direction: 'short' as const, asset: 'ETH' };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({});
      expect(mockTrack).toHaveBeenCalled();
    });

    it('ends the Trade sheet interactive span when bottom-sheet order creation fails', async () => {
      mockDepositWithOrder.mockRejectedValue(new Error('Deposit failed'));

      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToOrder({
        direction: 'long',
        asset: 'BTC',
        useBottomSheet: true,
      });

      await waitFor(() => {
        expect(failPerpsTradeSheetInteractiveTrace).toHaveBeenCalledWith(
          'transaction_creation_failed',
        );
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when depositWithOrder rejects', async () => {
      const depositError = new Error('Deposit failed');
      mockDepositWithOrder.mockRejectedValue(depositError);

      const { result } = renderHook(() => usePerpsNavigation());
      const params = {
        direction: 'long' as const,
        asset: 'BTC',
        useBottomSheet: true,
      };

      result.current.navigateToOrder(params);

      await waitFor(() => {
        expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
        expect(mockShowToast).toHaveBeenCalledWith({});
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(failPerpsTradeSheetInteractiveTrace).toHaveBeenCalledWith(
        'transaction_creation_failed',
      );
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

    it('opens the adjust margin screen for control', () => {
      const position = { symbol: 'ETH' } as Position;
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToAdjustMargin(position, 'add');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ADJUST_MARGIN, {
        position,
        mode: 'add',
        enableHaptics: undefined,
      });
    });

    it('opens the adjust margin bottom sheet for treatment', () => {
      const position = { symbol: 'ETH' } as Position;
      const { result } = renderHook(() => usePerpsNavigation());

      result.current.navigateToAdjustMargin(position, 'remove', {
        enableHaptics: true,
        useBottomSheet: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ADJUST_MARGIN, {
        position,
        mode: 'remove',
        enableHaptics: true,
        useBottomSheet: true,
      });
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
