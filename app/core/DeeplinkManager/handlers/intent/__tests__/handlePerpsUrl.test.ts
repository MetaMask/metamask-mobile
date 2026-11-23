import { handlePerpsUrl, createPerpsDeeplinkIntent } from '../handlePerpsUrl';
import Engine from '../../../../../core/Engine';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../../redux';
import {
  selectIsFirstTimePerpsUser,
  selectPerpsLastViewedMarketSymbol,
  selectPerpsMode,
} from '../../../../../components/UI/Perps/selectors/perpsController';
import { shouldPopPerpsRoute } from '../../../../../components/UI/Perps/utils/perpsModeSwitch';
import {
  selectPerpsProModeEnabledFlag,
  selectPerpsTerminalBackendEnabledFlag,
} from '../../../../../components/UI/Perps/selectors/featureFlags';
import { PerpsMode } from '@metamask/perps-controller';
import { analytics } from '../../../../../util/analytics/analytics';
import { PriceAlertAnalytics } from '../../../../../components/UI/Assets/PriceAlerts/constants';
import { MetaMetricsEvents } from '../../../../Analytics';
// Mock dependencies
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));
jest.mock('../../../../../components/UI/Perps/selectors/perpsController');
jest.mock('../../../../../components/UI/Perps/selectors/featureFlags', () => ({
  selectPerpsProModeEnabledFlag: jest.fn(),
  selectPerpsTerminalBackendEnabledFlag: jest.fn(),
}));
const mockGetCachedMarketDataForActiveProvider = jest.fn();
const mockGetMarkets = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        setAttributionContext: jest.fn(),
        getAttributionContext: jest.fn(() => ({})),
        clearAttributionContext: jest.fn(),
        mergeAttributionContext: jest.fn((props = {}) => props),
        getCachedMarketDataForActiveProvider: (...args: unknown[]) =>
          mockGetCachedMarketDataForActiveProvider(...args),
        getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
        setPerpsMode: jest.fn(),
      },
    },
  },
}));
jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));
describe('handlePerpsUrl', () => {
  let mockNavigate: jest.Mock;
  let mockSetParams: jest.Mock;
  let mockGetState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup navigation mocks
    mockNavigate = jest.fn();
    mockSetParams = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
      setParams: mockSetParams,
    } as unknown as typeof NavigationService.navigation;

    // Mock DevLogger
    (DevLogger.log as jest.Mock) = jest.fn();

    // Mock ReduxService.store.getState
    mockGetState = jest.fn();
    (ReduxService.store.getState as jest.Mock) = mockGetState;

    // Pro mode inactive by default, matching existing PERPS_HOME assertions.
    jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(false);
    jest.mocked(selectPerpsMode).mockReturnValue(PerpsMode.Lite);

    // No market list by default: symbols keep the uppercase normalization.
    jest.mocked(selectPerpsTerminalBackendEnabledFlag).mockReturnValue(false);
    mockGetCachedMarketDataForActiveProvider.mockReturnValue(null);
    mockGetMarkets.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('handlePerpsUrl', () => {
    it('navigates to tutorial for first-time users', async () => {
      // Mock first-time user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('navigates to wallet home with Perps tab for returning users', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Tab selection is now passed as route params (read by the Wallet view
      // via useHomeDeepLinkEffects) instead of a delayed setParams call.
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('navigates to tutorial for first-time user on testnet', async () => {
      // Mock first-time user on testnet
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });

    it('defaults to tutorial when state is undefined', async () => {
      // Mock undefined state returning true (default)
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });

    it('falls back to markets list on error', async () => {
      // Mock selector to return false (returning user)
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      // Mock navigation.navigate to throw an error for the first call
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });
  });

  describe('handlePerpsUrl - asset deeplinks', () => {
    it('navigates to market details with valid symbol', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=BTC' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'BTC',
            name: 'BTC',
            price: '0',
            change24h: '0',
            change24hPercent: '0',
            volume24h: '0',
            volume: '0',
            fundingRate: 0,
            openInterest: '0',
            maxLeverage: '100',
            logoUrl: '',
            nextFundingTime: 0,
            fundingIntervalHours: 8,
          }),
          source: 'deeplink',
        },
      });
    });

    it('navigates to market details for ETH symbol', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=ETH' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'ETH',
            name: 'ETH',
          }),
          source: 'deeplink',
        },
      });
    });

    it('converts symbol to uppercase', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=btc' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'BTC',
            name: 'BTC',
          }),
          source: 'deeplink',
        },
      });
    });

    it('navigates to markets list when no symbol provided', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('navigates to markets list with empty symbol', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('falls back to markets list on error', async () => {
      // Mock error in navigation
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=BTC' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('navigates to markets list for malformed URL parameters', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&invalid&params&here',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('navigates to tutorial for first-time users regardless of parameters', async () => {
      // Mock first-time user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      // First-time users always go to tutorial, even with screen=markets parameter
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      // Should not call setParams or navigate to markets
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('navigates directly to markets for returning users with screen=markets parameter', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      // Returning users with screen=markets parameter go directly to markets
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      // Should not call setParams for direct navigation
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('navigates to the default Pro market instead of Perps home when Pro mode is active', async () => {
      // Mock returning user with Pro mode active
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
      jest.mocked(selectPerpsMode).mockReturnValue(PerpsMode.Pro);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      // Perps Home must never be shown while Pro mode is active (TAT-3612).
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({
          market: expect.objectContaining({ symbol: 'BTC' }),
          source: 'deeplink',
        }),
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({ screen: Routes.PERPS.PERPS_HOME }),
      );
    });

    it('navigates to wallet tab for returning users with regular perps URL', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Returning users with regular perps URL go to wallet tab
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('navigates to markets for screen=markets parameter with additional query params', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=markets&utm_source=deeplink',
      });

      // Should navigate to markets for screen=markets parameter
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
    });

    it('navigates to wallet tab when screen=tabs specified', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=tabs' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('passes tab parameter for future extensibility', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=tabs&tab=portfolio' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
        specificTab: 'portfolio',
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });
  });

  describe('handlePerpsUrl - screen=home deeplinks', () => {
    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
    });

    it('navigates directly to PerpsHomeView with screen=home', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=home' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('first-time users go to tutorial even with screen=home', async () => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps?screen=home' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });
  });

  describe('handlePerpsUrl - screen=market-list deeplinks', () => {
    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
    });

    it('navigates to PerpsMarketListView with screen=market-list', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=market-list' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: { source: 'deeplink' },
      });
    });

    it('navigates to crypto markets with tab=crypto', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=market-list&tab=crypto',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          source: 'deeplink',
          defaultMarketTypeFilter: 'crypto',
        },
      });
    });

    it('navigates to stocks markets with tab=stocks', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=market-list&tab=stocks',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          source: 'deeplink',
          defaultMarketTypeFilter: 'stock',
        },
      });
    });

    it('navigates to all markets with tab=all', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=market-list&tab=all' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          source: 'deeplink',
          defaultMarketTypeFilter: 'all',
        },
      });
    });

    it('ignores unknown tab values', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=market-list&tab=unknown',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: { source: 'deeplink' },
      });
    });

    it('first-time users go to tutorial even with tab parameter', async () => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=market-list&tab=crypto',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });
  });

  describe('handlePerpsUrl - screen=markets backwards compatibility', () => {
    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
    });

    it('screen=markets navigates to PerpsHomeView (backwards compat)', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('screen=markets ignores tab parameter for backwards compat', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=markets&tab=crypto' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });
  });

  describe('handlePerpsUrl - HIP-3 symbol parsing', () => {
    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
    });

    it('parses HIP-3 symbol format xyz:TSLA', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=xyz:TSLA' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'xyz:TSLA',
            name: 'TSLA',
            marketSource: 'xyz',
          }),
          source: 'deeplink',
        },
      });
    });

    it('parses HIP-3 symbol format xyz:xyz100', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&symbol=xyz:xyz100',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'xyz:XYZ100',
            name: 'XYZ100',
            marketSource: 'xyz',
          }),
          source: 'deeplink',
        },
      });
    });

    it('handles lowercase HIP-3 dex prefix', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=XYZ:AAPL' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'xyz:AAPL',
            name: 'AAPL',
            marketSource: 'xyz',
          }),
          source: 'deeplink',
        },
      });
    });

    it('standard crypto symbol has no marketSource', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=BTC' });

      const navigateCall = mockNavigate.mock.calls[0];
      const market = navigateCall[1].params.market;

      expect(market.symbol).toBe('BTC');
      expect(market.marketSource).toBeUndefined();
    });
  });

  describe('handlePerpsUrl - canonical symbol resolution', () => {
    const getNavigatedMarket = () =>
      mockNavigate.mock.calls[0][1].params.market;

    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
    });

    it.each([
      ['kpepe', 'kPEPE'],
      ['kPEPE', 'kPEPE'],
      ['KPEPE', 'kPEPE'],
      ['klunc', 'kLUNC'],
      ['btc', 'BTC'],
    ])(
      'opens the cached market symbol for %s as %s',
      async (rawSymbol, expectedSymbol) => {
        mockGetCachedMarketDataForActiveProvider.mockReturnValue([
          { symbol: 'BTC' },
          { symbol: 'kPEPE' },
          { symbol: 'kLUNC' },
        ]);

        await handlePerpsUrl({
          perpsPath: `perps?screen=asset&symbol=${rawSymbol}`,
        });

        expect(getNavigatedMarket()).toEqual(
          expect.objectContaining({
            symbol: expectedSymbol,
            name: expectedSymbol,
          }),
        );
        expect(mockGetCachedMarketDataForActiveProvider).toHaveBeenCalledWith({
          skipTTL: true,
        });
        expect(mockGetMarkets).not.toHaveBeenCalled();
      },
    );

    it('fetches standalone markets when the market cache is empty', async () => {
      jest.mocked(selectPerpsTerminalBackendEnabledFlag).mockReturnValue(true);
      mockGetMarkets.mockResolvedValue([{ name: 'BTC' }, { name: 'kPEPE' }]);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=kpepe' });

      expect(mockGetMarkets).toHaveBeenCalledWith({
        standalone: true,
        useTerminalApi: true,
      });
      expect(getNavigatedMarket().symbol).toBe('kPEPE');
    });

    it('fetches standalone markets when the market cache has no match', async () => {
      mockGetCachedMarketDataForActiveProvider.mockReturnValue([
        { symbol: 'BTC' },
      ]);
      mockGetMarkets.mockResolvedValue([{ name: 'BTC' }, { name: 'kPEPE' }]);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=kpepe' });

      expect(mockGetMarkets).toHaveBeenCalled();
      expect(getNavigatedMarket().symbol).toBe('kPEPE');
    });

    it.each(['BTC', 'xyz:TSLA'])(
      'opens %s without fetching markets when the cache is empty',
      async (rawSymbol) => {
        await handlePerpsUrl({
          perpsPath: `perps?screen=asset&symbol=${rawSymbol}`,
        });

        expect(mockGetMarkets).not.toHaveBeenCalled();
        expect(getNavigatedMarket().symbol).toBe(rawSymbol);
      },
    );

    it('opens the canonical HIP-3 symbol for a differently cased dex and asset', async () => {
      mockGetCachedMarketDataForActiveProvider.mockReturnValue([
        { symbol: 'xyz:TSLA' },
      ]);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=XYZ:tsla' });

      expect(getNavigatedMarket()).toEqual(
        expect.objectContaining({
          symbol: 'xyz:TSLA',
          name: 'TSLA',
          marketSource: 'xyz',
        }),
      );
    });

    it('opens the uppercase symbol when the market list has no match', async () => {
      mockGetCachedMarketDataForActiveProvider.mockReturnValue([
        { symbol: 'BTC' },
      ]);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&symbol=notarealmkt',
      });

      expect(getNavigatedMarket()).toEqual(
        expect.objectContaining({ symbol: 'NOTAREALMKT', name: 'NOTAREALMKT' }),
      );
    });

    it('opens the uppercase symbol when the market fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockGetMarkets.mockRejectedValue(fetchError);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=kpepe' });

      expect(getNavigatedMarket().symbol).toBe('KPEPE');
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Failed to resolve market symbol:',
        fetchError,
      );
    });

    it('resolves the startup intent at the fetch deadline when getMarkets stalls', async () => {
      mockGetMarkets.mockReturnValue(new Promise(() => undefined));
      const onIntent = jest.fn();

      const pendingIntent = createPerpsDeeplinkIntent({
        perpsPath: 'perps?screen=asset&symbol=kpepe',
      }).then(onIntent);
      await jest.advanceTimersByTimeAsync(1_999);

      expect(onIntent).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await pendingIntent;

      expect(onIntent).toHaveBeenCalledWith({
        target: expect.objectContaining({
          params: expect.objectContaining({
            params: expect.objectContaining({
              market: expect.objectContaining({ symbol: 'KPEPE' }),
            }),
          }),
        }),
      });
    });

    it('returns the canonical market in the startup intent', async () => {
      mockGetCachedMarketDataForActiveProvider.mockReturnValue([
        { symbol: 'kPEPE' },
      ]);

      const intent = await createPerpsDeeplinkIntent({
        perpsPath: 'perps?screen=asset&symbol=kpepe',
      });

      expect(intent.target).toEqual({
        type: 'main-stack',
        routeName: Routes.PERPS.ROOT,
        params: {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            source: 'deeplink',
            market: expect.objectContaining({ symbol: 'kPEPE' }),
          }),
        },
      });
    });
  });

  describe('price alert notification tracking', () => {
    it('fires PRICE_ALERT_NOTIFICATION_OPENED exactly once when source=price_alert_notification and screen=asset (warm path)', async () => {
      const perpsPath =
        'perps?screen=asset&symbol=xyz%3AXYZ100&source=price_alert_notification&alert_type=threshold&price_at_trigger=150.25&triggered_at=1758624000000';

      await handlePerpsUrl({ perpsPath });

      // Must fire exactly once — createPerpsDeeplinkIntent owns tracking for all paths.
      expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            alert_type: 'threshold',
            alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
            price_at_trigger: 150.25,
            token_symbol: 'XYZ100',
          }),
        }),
      );
    });

    it('fires PRICE_ALERT_NOTIFICATION_OPENED via createPerpsDeeplinkIntent (cold/startup path)', async () => {
      const perpsPath =
        'perps?screen=asset&symbol=BTC&source=price_alert_notification&alert_type=threshold&price_at_trigger=95000&triggered_at=1758624000000';

      await createPerpsDeeplinkIntent({ perpsPath });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            alert_type: 'threshold',
            alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
            price_at_trigger: 95000,
            token_symbol: 'BTC',
            asset_id: 'BTC',
          }),
        }),
      );
    });

    it('does not fire PRICE_ALERT_NOTIFICATION_OPENED for non-notification deeplinks', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=BTC' });

      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });

    it('does not fire PRICE_ALERT_NOTIFICATION_OPENED when screen is not asset', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=home&source=price_alert_notification',
      });

      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('handlePerpsUrl - pro mode deeplinks', () => {
    const mockSetPerpsMode = () =>
      Engine.context.PerpsController.setPerpsMode as jest.Mock;

    beforeEach(() => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);
      mockSetPerpsMode().mockReset();
    });

    it('sets Pro mode before opening the given market when the Pro flag is enabled', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
      const calls: string[] = [];
      mockSetPerpsMode().mockImplementation(() => {
        calls.push('mode');
      });
      mockNavigate.mockImplementation(() => {
        calls.push('navigate');
      });

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });

      expect(mockSetPerpsMode()).toHaveBeenCalledWith(PerpsMode.Pro);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({
          market: expect.objectContaining({ symbol: 'ETH' }),
          source: 'deeplink',
        }),
      });
      expect(calls).toEqual(['mode', 'navigate']);
    });

    it('opens BTC when a Pro link omits the symbol', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&mode=pro' });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            market: expect.objectContaining({ symbol: 'BTC' }),
          }),
        }),
      );
    });

    it('opens a HIP-3 market in Pro mode', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=xyz:TSLA',
      });

      expect(mockSetPerpsMode()).toHaveBeenCalledWith(PerpsMode.Pro);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            market: expect.objectContaining({ symbol: 'xyz:TSLA' }),
          }),
        }),
      );
    });

    it('opens the market without changing mode when the Pro flag is disabled', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(false);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });

      expect(mockSetPerpsMode()).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            market: expect.objectContaining({ symbol: 'ETH' }),
          }),
        }),
      );
    });

    it('opens BTC without changing mode when the Pro flag is disabled and no symbol is given', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&mode=pro' });

      expect(mockSetPerpsMode()).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            market: expect.objectContaining({ symbol: 'BTC' }),
          }),
        }),
      );
    });

    it('sends first-time users to the tutorial after enabling Pro mode', async () => {
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=BTC',
      });

      expect(mockSetPerpsMode()).toHaveBeenCalledWith(PerpsMode.Pro);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });

    it('leaves mode unchanged for asset links that do not request Pro', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=ETH' });

      expect(mockSetPerpsMode()).not.toHaveBeenCalled();
    });

    it('attaches prepare only when mode=pro is requested and the flag is on', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
      const assetIntent = await createPerpsDeeplinkIntent({
        perpsPath: 'perps?screen=asset&symbol=ETH',
      });
      const proIntent = await createPerpsDeeplinkIntent({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });

      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(false);
      const proIntentWithFlagOff = await createPerpsDeeplinkIntent({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });

      expect(assetIntent.prepare).toBeUndefined();
      expect(proIntent.prepare).toEqual(expect.any(Function));
      expect(proIntentWithFlagOff.prepare).toBeUndefined();
    });

    it.each(['home', 'markets'] as const)(
      'opens the Pro market for screen=%s when Lite is selected and mode=pro',
      async (screen) => {
        jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
        jest.mocked(selectPerpsMode).mockReturnValue(PerpsMode.Lite);
        jest.mocked(selectPerpsLastViewedMarketSymbol).mockReturnValue('ETH');

        await handlePerpsUrl({ perpsPath: `perps?screen=${screen}&mode=pro` });

        expect(mockSetPerpsMode()).toHaveBeenCalledWith(PerpsMode.Pro);
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            source: 'deeplink',
            market: expect.objectContaining({ symbol: 'ETH' }),
          }),
        });
      },
    );

    it('keeps Lite home for screen=home when mode=pro and the Pro flag is off', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(false);
      jest.mocked(selectPerpsMode).mockReturnValue(PerpsMode.Lite);

      await handlePerpsUrl({ perpsPath: 'perps?screen=home&mode=pro' });

      expect(mockSetPerpsMode()).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('removes Lite home after a Pro market deeplink so back does not return to it', async () => {
      // Stack history lives on NavigationService, which a component-view
      // render of a screen does not exercise. This handler is already a unit.
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
      // The array starts as Lite Home and then receives the market route.
      // A name/params annotation keeps both entries assignable.
      const perpsState: {
        key: string;
        index: number;
        routes: { key: string; name: string; params: object }[];
      } = {
        key: 'perps-stack',
        index: 0,
        routes: [
          {
            key: 'home',
            name: Routes.PERPS.PERPS_HOME,
            params: { source: 'deeplink' },
          },
        ],
      };
      const rootState = {
        index: 1,
        routes: [
          { key: 'tabs', name: Routes.WALLET.HOME },
          {
            key: 'perps-route',
            name: Routes.PERPS.ROOT,
            state: perpsState,
          },
        ],
      };
      const mockDispatch = jest.fn();
      mockNavigate.mockImplementation(
        (_routeName: string, params: { screen: string; params: object }) => {
          perpsState.routes.push({
            key: 'market',
            name: params.screen,
            params: params.params,
          });
          perpsState.index = perpsState.routes.length - 1;
        },
      );
      NavigationService.navigation = {
        navigate: mockNavigate,
        setParams: mockSetParams,
        getState: () => rootState,
        dispatch: mockDispatch,
      } as unknown as typeof NavigationService.navigation;

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });
      jest.runOnlyPendingTimers();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
          params: expect.objectContaining({
            market: expect.objectContaining({ symbol: 'ETH' }),
          }),
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESET',
          target: 'perps-stack',
          payload: expect.objectContaining({
            index: 0,
            routes: [
              expect.objectContaining({
                name: Routes.PERPS.MARKET_DETAILS,
                params: expect.objectContaining({
                  homeDroppedFromHistory: true,
                  source: 'deeplink',
                  market: expect.objectContaining({ symbol: 'ETH' }),
                }),
              }),
            ],
          }),
        }),
      );
      const resetPayload = mockDispatch.mock.calls[0][0].payload as {
        index: number;
        routes: { name: string; params?: object }[];
      };
      expect(
        resetPayload.routes.some(
          (route) => route.name === Routes.PERPS.PERPS_HOME,
        ),
      ).toBe(false);
      expect(shouldPopPerpsRoute(true, resetPayload)).toBe(false);
    });

    it('still opens the market when setting Pro mode throws', async () => {
      jest.mocked(selectPerpsProModeEnabledFlag).mockReturnValue(true);
      mockSetPerpsMode().mockImplementation(() => {
        throw new Error('controller unavailable');
      });

      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&mode=pro&symbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_DETAILS,
        }),
      );
    });
  });
});
