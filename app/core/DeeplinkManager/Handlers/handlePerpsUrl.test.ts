import { handlePerpsUrl, handlePerpsAssetUrl } from './handlePerpsUrl';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../components/UI/Perps/constants/perpsConfig';
import { store } from '../../../store';
import { selectIsFirstTimePerpsUser } from '../../../components/UI/Perps/selectors/perpsController';

// Mock dependencies
jest.mock('../../NavigationService');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('../../../store');
jest.mock('../../../components/UI/Perps/selectors/perpsController');

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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should default to tutorial when state is undefined', async () => {
      // Mock undefined state returning true (default)
      jest.mocked(selectIsFirstTimePerpsUser).mockReturnValue(true);

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
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
        screen: Routes.PERPS.MARKETS,
      });
    });
  });

  describe('handlePerpsAssetUrl', () => {
    it('should navigate to market details with valid symbol', async () => {
      await handlePerpsAssetUrl({ assetPath: '?symbol=BTC' });

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

    it('should handle symbol without question mark', async () => {
      await handlePerpsAssetUrl({ assetPath: 'symbol=ETH' });

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
      await handlePerpsAssetUrl({ assetPath: '?symbol=btc' });

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
      await handlePerpsAssetUrl({ assetPath: '?' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('should navigate to markets list with empty assetPath', async () => {
      await handlePerpsAssetUrl({ assetPath: '' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('should fallback to markets list on error', async () => {
      // Mock error in navigation
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handlePerpsAssetUrl({ assetPath: '?symbol=BTC' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('should handle malformed URL parameters gracefully', async () => {
      await handlePerpsAssetUrl({ assetPath: '?invalid&params&here' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('should log debug messages during processing', async () => {
      await handlePerpsAssetUrl({ assetPath: '?symbol=SOL' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsAssetUrl] Starting with assetPath:',
        '?symbol=SOL',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsAssetUrl] Parsed symbol:',
        'SOL',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePerpsAssetUrl] Navigating directly to market details for:',
        'SOL',
      );
    });
  });
});
