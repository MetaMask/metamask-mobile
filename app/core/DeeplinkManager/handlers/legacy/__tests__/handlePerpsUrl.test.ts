import { handlePerpsUrl } from '../handlePerpsUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../../../components/UI/Perps/constants/perpsConfig';
import { store } from '../../../../../store';
import { selectIsFirstTimePerpsUser } from '../../../../../components/UI/Perps/selectors/perpsController';

// Mock dependencies
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../store');
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
    NavigationService.navigation = {
      navigate: mockNavigate,
      setParams: mockSetParams,
    } as unknown as typeof NavigationService.navigation;

    // Mock DevLogger
    (DevLogger.log as jest.Mock) = jest.fn();

    // Mock store.getState
    mockGetState = jest.fn();
    (store.getState as jest.Mock) = mockGetState;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('handlePerpsUrl', () => {
    it('should navigate to tutorial for first-time users', async () => {
      // Mock first-time user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('should navigate to wallet home with Perps tab for returning users', async () => {
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

    it('should handle first-time user on testnet', async () => {
      // Mock first-time user on testnet
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });

    it('should default to tutorial when state is undefined', async () => {
      // Mock undefined state returning true (default)
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
    });

    it('should fallback to markets list on error', async () => {
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
      });
    });
  });

  describe('handlePerpsUrl - asset deeplinks', () => {
    it('should navigate to market details with valid symbol', async () => {
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
        },
      });
    });

    it('should handle asset screen with ETH symbol', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=ETH' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'ETH',
            name: 'ETH',
          }),
        },
      });
    });

    it('should convert symbol to uppercase', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=btc' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'BTC',
            name: 'BTC',
          }),
        },
      });
    });

    it('should navigate to markets list when no symbol provided', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    });

    it('should navigate to markets list with empty symbol', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    });

    it('should fallback to markets list on error', async () => {
      // Mock error in navigation
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=BTC' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    });

    it('should handle malformed URL parameters gracefully', async () => {
      await handlePerpsUrl({
        perpsPath: 'perps?screen=asset&invalid&params&here',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    });

    it('should log debug messages during processing', async () => {
      await handlePerpsUrl({ perpsPath: 'perps?screen=asset&symbol=SOL' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Starting perps deeplink handling with path:',
        'perps?screen=asset&symbol=SOL',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Parsed navigation parameters:',
        { screen: 'asset', symbol: 'SOL' },
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Navigating to asset details for symbol:',
        'SOL',
      );
    });

    it('should navigate to tutorial for first-time users regardless of parameters', async () => {
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

    it('should navigate directly to markets for returning users with screen=markets parameter', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      // Returning users with screen=markets parameter go directly to markets
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
      // Should not call setParams for direct navigation
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('should navigate to wallet tab for returning users with regular perps URL', async () => {
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

    it('should handle screen=markets parameter with additional query params', async () => {
      // Mock returning user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({
        perpsPath: 'perps?screen=markets&utm_source=deeplink',
      });

      // Should navigate to markets for screen=markets parameter
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
      expect(selectIsFirstTimePerpsUser).toHaveBeenCalled();
    });

    it('should navigate to wallet tab when screen=tabs specified', async () => {
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

    it('should handle tab parameter for future extensibility', async () => {
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

    it('should log correct debug messages for parameter-based routing', async () => {
      // Test first-time user
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Starting perps deeplink handling with path:',
        'perps?screen=markets',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] First-time user, navigating to tutorial regardless of URL parameters',
      );
    });

    it('should log correct debug messages for returning user markets navigation', async () => {
      // Test returning user with screen=markets parameter
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(false);

      await handlePerpsUrl({ perpsPath: 'perps?screen=markets' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsUrl] Navigating to markets list',
      );
    });
  });
});
