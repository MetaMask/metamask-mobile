import { handlePerpsUrl, handlePerpsAssetUrl } from './handlePerpsUrl';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../Engine';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../components/UI/Perps/constants/perpsConfig';

// Mock dependencies
jest.mock('../../NavigationService');
jest.mock('../../Engine');
jest.mock('../../SDKConnect/utils/DevLogger');

describe('handlePerpsUrl', () => {
  let mockNavigate: jest.Mock;
  let mockSetParams: jest.Mock;
  const originalEngineContext = Engine.context;

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
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Restore original Engine context
    Object.defineProperty(Engine, 'context', {
      value: originalEngineContext,
      writable: true,
      configurable: true,
    });
  });

  describe('handlePerpsUrl', () => {
    it('should navigate to tutorial for first-time users', async () => {
      // Mock first-time user
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: true,
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

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
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: false,
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);

      // Fast-forward timer to trigger setParams
      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('should handle isFirstTimeUser as object with testnet property', async () => {
      // Mock first-time user with object structure
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: {
                testnet: true,
                mainnet: false,
              },
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should default to tutorial when isFirstTimeUser is undefined', async () => {
      // Mock undefined state
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {},
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should fallback to markets list on error', async () => {
      // Mock error in PerpsController
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: null,
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

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

  describe('isFirstTimePerpsUser helper', () => {
    it('should return boolean value when isFirstTimeUser is boolean', async () => {
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: false,
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Should navigate to wallet (returning user flow)
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);

      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('should handle object with testnet/mainnet properties', async () => {
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: {
                testnet: false,
                mainnet: true,
              },
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Should navigate to wallet (testnet = false)
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);

      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('should default to true when testnet is not specified', async () => {
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: {
                mainnet: false,
              },
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Should navigate to tutorial (default to true)
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should handle missing PerpsController gracefully', async () => {
      Object.defineProperty(Engine, 'context', {
        value: {} as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Should default to tutorial
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should handle null isFirstTimeUser', async () => {
      Object.defineProperty(Engine, 'context', {
        value: {
          ...originalEngineContext,
          PerpsController: {
            state: {
              isFirstTimeUser: null,
            },
          },
        } as unknown as typeof Engine.context,
        writable: true,
        configurable: true,
      });

      await handlePerpsUrl({ perpsPath: 'perps' });

      // Should default to tutorial
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    });
  });
});
