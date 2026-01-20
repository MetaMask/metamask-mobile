import { handlePerpsUrl } from '../handlePerpsUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../../../components/UI/Perps/constants/perpsConfig';
import ReduxService from '../../../../redux';
import { selectIsFirstTimePerpsUser } from '../../../../../components/UI/Perps/selectors/perpsController';

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
    jest.spyOn(NavigationService, 'navigation', 'get').mockReturnValue({
      navigate: mockNavigate,
      setParams: mockSetParams,
    } as unknown as typeof NavigationService.navigation);

    // Mock DevLogger
    (DevLogger.log as jest.Mock) = jest.fn();

    // Mock ReduxService.store.getState
    mockGetState = jest.fn();
    (ReduxService.store.getState as jest.Mock) = mockGetState;
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);

      // Fast-forward timer to trigger setParams
      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
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

    it('navigates to wallet tab for returning users with regular perps URL', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Returning users with regular perps URL go to wallet tab
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();

      // Fast-forward timer to trigger setParams
      jest.runAllTimers();

      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();

      // Fast-forward timer to trigger setParams
      jest.runAllTimers();
      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('passes tab parameter for future extensibility', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=tabs&tab=portfolio' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();

      // Fast-forward timer to trigger setParams
      jest.runAllTimers();
      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
        specificTab: 'portfolio',
      });
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
          defaultMarketTypeFilter: 'stocks_and_commodities',
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
});
