/**
 * Unit tests for deep link analytics utility functions
 * Tests app installation detection, property extraction, and event creation
 */

import {
  determineAppInstallationStatus,
  extractSensitiveProperties,
  determineInterstitialState,
  determineSignatureStatus,
  extractRouteFromUrl,
  mapSupportedActionToRoute,
  createDeepLinkUsedEventBuilder,
  detectAppInstallation,
} from './deepLinkAnalytics';
import { DeeplinkUrlParams } from '../../core/DeeplinkManager/types/deepLink.types';
import {
  DeepLinkRoute,
  InterstitialState,
  SignatureStatus,
  DeepLinkAnalyticsContext,
} from '../../core/DeeplinkManager/types/deepLinkAnalytics.types';
import { ACTIONS } from '../../constants/deeplinks';

// Mock Logger to avoid console output during tests
jest.mock('../Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock Branch.io
jest.mock('react-native-branch', () => ({
  getLatestReferringParams: jest.fn(),
}));

// Mock the detectAppInstallation function
jest.mock('./deepLinkAnalytics', () => {
  const originalModule = jest.requireActual('./deepLinkAnalytics');
  return {
    ...originalModule,
    detectAppInstallation: jest.fn(),
  };
});

describe('deepLinkAnalytics', () => {
  describe('determineAppInstallationStatus', () => {
    it('detects deferred deep link when user installs app via Branch link', () => {
      const params = {
        '+is_first_session': true,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(false);
    });

    it('detects returning user when app was already installed', () => {
      const params = {
        '+is_first_session': false,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 1,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('detects direct app launch when not from Branch link', () => {
      const params = {
        '+is_first_session': false,
        '+clicked_branch_link': false,
        BNCUpdateStateInstall: 1,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('defaults to app installed when no params available', () => {
      const noParams = null;
      const result = determineAppInstallationStatus(noParams);
      expect(result).toBe(true);
    });

    it('defaults to app installed when params are empty', () => {
      const emptyParams = {};
      const result = determineAppInstallationStatus(emptyParams);
      expect(result).toBe(true);
    });

    it('handles missing clicked_branch_link parameter', () => {
      const params = {
        '+is_first_session': true,
        '+clicked_branch_link': undefined,
        BNCUpdateStateInstall: 0,
      };
      const result = determineAppInstallationStatus(params);
      expect(result).toBe(true);
    });

    it('handles missing is_first_session parameter', () => {
      const params = {
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      };
      const result = determineAppInstallationStatus(params);
      expect(result).toBe(true);
    });

    it('defaults to app installed for invalid parameter types', () => {
      const invalidParams = 'invalid-params';
      const result = determineAppInstallationStatus(invalidParams);
      expect(result).toBe(true);
    });
  });

  describe('extractSensitiveProperties', () => {
    const mockUrlParams = {
      from: 'ETH',
      to: 'USDC',
      amount: '100',
      asset: 'ETH',
      slippage: '0.5',
      symbol: 'BTC',
      screen: 'markets',
      tab: 'positions',
      provider: 'ramp',
      payment_method: 'card',
      fiat_currency: 'USD',
      fiat_quantity: '100',
      gas: '21000',
      gasPrice: '20',
      crypto_currency: 'ETH',
      crypto_amount: '0.1',
    };

    it('extracts common transaction properties for swap route', () => {
      const swapRoute = DeepLinkRoute.SWAP;
      const result = extractSensitiveProperties(swapRoute, mockUrlParams);
      expect(result.from).toBe('ETH');
      expect(result.to).toBe('USDC');
      expect(result.amount).toBe('100');
      expect(result.asset).toBe('ETH');
    });

    it('extracts swap-specific properties including slippage', () => {
      const swapRoute = DeepLinkRoute.SWAP;
      const result = extractSensitiveProperties(swapRoute, mockUrlParams);
      expect(result.slippage).toBe('0.5');
      expect(result.symbol).toBeUndefined();
    });

    it('extracts perps-specific properties including symbol and navigation', () => {
      const perpsRoute = DeepLinkRoute.PERPS;
      const result = extractSensitiveProperties(perpsRoute, mockUrlParams);
      expect(result.symbol).toBe('BTC');
      expect(result.screen).toBe('markets');
      expect(result.tab).toBe('positions');
      expect(result.slippage).toBeUndefined();
    });

    it('extracts deposit-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.DEPOSIT,
        mockUrlParams,
      );

      expect(result.provider).toBe('ramp');
      expect(result.payment_method).toBe('card');
      expect(result.fiat_currency).toBe('USD');
      expect(result.fiat_quantity).toBe('100');
    });

    it('extracts transaction-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.TRANSACTION,
        mockUrlParams,
      );

      expect(result.gas).toBe('21000');
      expect(result.gasPrice).toBe('20');
    });

    it('extracts buy-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.BUY,
        mockUrlParams,
      );

      expect(result.crypto_currency).toBe('ETH');
      expect(result.crypto_amount).toBe('0.1');
    });

    it('extracts sell-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.SELL,
        mockUrlParams,
      );

      expect(result.crypto_currency).toBe('ETH');
      expect(result.crypto_amount).toBe('0.1');
    });

    it('extracts previewToken for home route', () => {
      const urlParamsWithPreviewToken = {
        ...mockUrlParams,
        previewToken: 'test-preview-token-123',
      };
      const homeResult = extractSensitiveProperties(
        DeepLinkRoute.HOME,
        urlParamsWithPreviewToken,
      );

      expect(homeResult.previewToken).toBe('test-preview-token-123');
      expect(homeResult.from).toBeUndefined();
      expect(homeResult.to).toBeUndefined();
    });

    it('returns empty object for home route without previewToken', () => {
      const homeResult = extractSensitiveProperties(
        DeepLinkRoute.HOME,
        mockUrlParams,
      );

      expect(homeResult).toEqual({});
    });

    it('returns empty object for invalid route', () => {
      const invalidResult = extractSensitiveProperties(
        DeepLinkRoute.INVALID,
        mockUrlParams,
      );

      expect(invalidResult).toEqual({});
    });

    it('returns empty object for empty urlParams', () => {
      const result = extractSensitiveProperties(DeepLinkRoute.SWAP, {});

      expect(result).toEqual({});
    });

    it('returns empty object for invalid route', () => {
      const result = extractSensitiveProperties(
        'invalid-route' as DeepLinkRoute,
        mockUrlParams,
      );

      expect(result).toEqual({});
    });
  });

  describe('determineInterstitialState', () => {
    const createMockContext = (
      overrides: Partial<DeepLinkAnalyticsContext> = {},
    ): DeepLinkAnalyticsContext => ({
      url: 'https://link.metamask.io/swap',
      route: DeepLinkRoute.SWAP,
      urlParams: {},
      signatureStatus: SignatureStatus.MISSING,
      interstitialShown: false,
      interstitialDisabled: false,
      ...overrides,
    });

    it('return NOT_SHOWN when interstitial was not shown', () => {
      const context = createMockContext({ interstitialShown: false });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.NOT_SHOWN);
    });

    it('return SKIPPED when user disabled interstitials and no action was taken', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialDisabled: true,
        interstitialAction: undefined,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.SKIPPED);
    });

    it('return ACCEPTED when user accepted the interstitial even if disabled', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialDisabled: true,
        interstitialAction: InterstitialState.ACCEPTED,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.ACCEPTED);
    });

    it('return REJECTED when user rejected the interstitial even if disabled', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialDisabled: true,
        interstitialAction: InterstitialState.REJECTED,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.REJECTED);
    });

    it('return ACCEPTED when user accepted the interstitial', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialAction: InterstitialState.ACCEPTED,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.ACCEPTED);
    });

    it('return REJECTED when user rejected the interstitial', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialAction: InterstitialState.REJECTED,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.REJECTED);
    });

    it('return NOT_SHOWN as default case', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialAction: undefined,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.NOT_SHOWN);
    });

    it('return NOT_SHOWN for deferred deep link when interstitial not shown', () => {
      const context = createMockContext({
        interstitialShown: false,
        branchParams: {
          '+clicked_branch_link': true,
          '+is_first_session': true,
        },
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.NOT_SHOWN);
    });

    it('return NOT_SHOWN for regular deep link when interstitial not shown', () => {
      const context = createMockContext({
        interstitialShown: false,
        branchParams: {
          '+clicked_branch_link': true,
          '+is_first_session': false,
        },
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.NOT_SHOWN);
    });

    it('return NOT_SHOWN when branchParams is undefined (timeout/failure scenario)', () => {
      const context = createMockContext({
        interstitialShown: false,
        branchParams: undefined,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.NOT_SHOWN);
    });
  });

  describe('determineSignatureStatus', () => {
    it('return VALID for valid signature', () => {
      const result = determineSignatureStatus('valid');
      expect(result).toBe(SignatureStatus.VALID);
    });

    it('return INVALID for invalid signature', () => {
      const result = determineSignatureStatus('invalid');
      expect(result).toBe(SignatureStatus.INVALID);
    });

    it('return MISSING for missing signature', () => {
      const result = determineSignatureStatus('missing');
      expect(result).toBe(SignatureStatus.MISSING);
    });

    it('return MISSING for unknown signature status', () => {
      const result = determineSignatureStatus('unknown');
      expect(result).toBe(SignatureStatus.MISSING);
    });
  });

  describe('mapSupportedActionToRoute', () => {
    it('maps swap action to SWAP route', () => {
      const swapAction = ACTIONS.SWAP;
      const result = mapSupportedActionToRoute(swapAction);
      expect(result).toBe(DeepLinkRoute.SWAP);
    });

    it.each([
      [ACTIONS.PERPS, DeepLinkRoute.PERPS],
      [ACTIONS.PERPS_MARKETS, DeepLinkRoute.PERPS],
      [ACTIONS.PERPS_ASSET, DeepLinkRoute.PERPS],
    ] as const)(
      'maps perps action %s to PERPS route',
      (action, expectedRoute) => {
        // Arrange & Act
        const result = mapSupportedActionToRoute(action);
        expect(result).toBe(expectedRoute);
      },
    );

    it('maps deposit action to DEPOSIT route', () => {
      const depositAction = ACTIONS.DEPOSIT;
      const result = mapSupportedActionToRoute(depositAction);
      expect(result).toBe(DeepLinkRoute.DEPOSIT);
    });

    it('maps send action to TRANSACTION route', () => {
      const sendAction = ACTIONS.SEND;
      const result = mapSupportedActionToRoute(sendAction);
      expect(result).toBe(DeepLinkRoute.TRANSACTION);
    });

    it.each([
      [ACTIONS.BUY, DeepLinkRoute.BUY],
      [ACTIONS.BUY_CRYPTO, DeepLinkRoute.BUY],
    ] as const)('maps buy action %s to BUY route', (action, expectedRoute) => {
      // Arrange & Act
      const result = mapSupportedActionToRoute(action);
      expect(result).toBe(expectedRoute);
    });

    it.each([
      [ACTIONS.SELL, DeepLinkRoute.SELL],
      [ACTIONS.SELL_CRYPTO, DeepLinkRoute.SELL],
    ] as const)(
      'maps sell action %s to SELL route',
      (action, expectedRoute) => {
        // Arrange & Act
        const result = mapSupportedActionToRoute(action);
        expect(result).toBe(expectedRoute);
      },
    );

    it('maps home action to HOME route', () => {
      const homeAction = ACTIONS.HOME;
      const result = mapSupportedActionToRoute(homeAction);
      expect(result).toBe(DeepLinkRoute.HOME);
    });

    it.each([
      [ACTIONS.DAPP, DeepLinkRoute.INVALID],
      [ACTIONS.WC, DeepLinkRoute.INVALID],
      [ACTIONS.CREATE_ACCOUNT, DeepLinkRoute.INVALID],
    ] as const)(
      'maps unsupported action %s to INVALID route',
      (action, expectedRoute) => {
        // Arrange & Act
        const result = mapSupportedActionToRoute(action);
        expect(result).toBe(expectedRoute);
      },
    );
  });

  describe('extractRouteFromUrl', () => {
    it('extracts swap route from URL', () => {
      const swapUrl = 'https://link.metamask.io/swap?from=ETH';
      const result = extractRouteFromUrl(swapUrl);
      expect(result).toBe(DeepLinkRoute.SWAP);
    });

    it('extract perps route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/perps?screen=markets',
      );
      expect(result).toBe(DeepLinkRoute.PERPS);
    });

    it('extract deposit route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/deposit?provider=ramp',
      );
      expect(result).toBe(DeepLinkRoute.DEPOSIT);
    });

    it('extract transaction route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/transaction?gas=21000',
      );
      expect(result).toBe(DeepLinkRoute.TRANSACTION);
    });

    it('extract buy route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/buy?crypto=ETH',
      );
      expect(result).toBe(DeepLinkRoute.BUY);
    });

    it('extract sell route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/sell?crypto=ETH',
      );
      expect(result).toBe(DeepLinkRoute.SELL);
    });

    it('extract home route for empty path', () => {
      const result = extractRouteFromUrl('https://link.metamask.io/');
      expect(result).toBe(DeepLinkRoute.HOME);
    });

    it('extract home route for home path', () => {
      const result = extractRouteFromUrl('https://link.metamask.io/home');
      expect(result).toBe(DeepLinkRoute.HOME);
    });

    it('return INVALID for unknown routes', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/unknown-route',
      );
      expect(result).toBe(DeepLinkRoute.INVALID);
    });

    it('returns INVALID for invalid URLs', () => {
      const result = extractRouteFromUrl('invalid-url');

      expect(result).toBe(DeepLinkRoute.INVALID);
    });
  });

  describe('createDeepLinkUsedEventBuilder', () => {
    let mockDetectAppInstallation: jest.MockedFunction<
      typeof import('./deepLinkAnalytics').detectAppInstallation
    >;

    beforeEach(() => {
      jest.clearAllMocks();
      const deepLinkAnalytics = jest.requireMock('./deepLinkAnalytics');
      mockDetectAppInstallation = deepLinkAnalytics.detectAppInstallation;
    });

    it('creates event with correct properties for swap route', async () => {
      mockDetectAppInstallation.mockResolvedValue(true);

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap?from=ETH&to=USDC&amount=100',
        route: DeepLinkRoute.SWAP,
        urlParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '100',
          slippage: '0.5',
          utm_source: 'twitter',
          utm_campaign: 'swap_promo',
        },
        signatureStatus: SignatureStatus.MISSING,
        interstitialShown: true,
        interstitialDisabled: false,
        interstitialAction: InterstitialState.ACCEPTED,
      };
      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();
      expect(result.properties.route).toBe('swap');
      expect(result.properties.was_app_installed).toBe(true);
      expect(result.properties.signature).toBe(SignatureStatus.MISSING);
      expect(result.properties.interstitial).toBe(InterstitialState.ACCEPTED);
      expect(result.properties.utm_source).toBe('twitter');
      expect(result.properties.utm_campaign).toBe('swap_promo');
      expect(result.sensitiveProperties).toEqual({
        from: 'ETH',
        to: 'USDC',
        amount: '100',
        slippage: '0.5',
      });
    });

    it('creates event for invalid route with target URL', async () => {
      const mockBranch = jest.requireMock('react-native-branch');
      mockBranch.getLatestReferringParams.mockResolvedValue({
        '+is_first_session': true,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      });

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/invalid-route?test=param',
        route: DeepLinkRoute.INVALID,
        urlParams: { test: 'param' } as Partial<DeeplinkUrlParams>,
        signatureStatus: SignatureStatus.INVALID,
        interstitialShown: false,
        interstitialDisabled: false,
      };
      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();
      expect(result.properties.route).toBe('invalid');
      expect(result.properties.was_app_installed).toBe(false);
      expect(result.properties.signature).toBe(SignatureStatus.INVALID);
      expect(result.properties.target).toBe(
        'https://link.metamask.io/invalid-route?test=param',
      );
    });

    it('returns default values when Branch.io throws error', async () => {
      const mockBranch = jest.requireMock('react-native-branch');
      mockBranch.getLatestReferringParams.mockRejectedValue(
        new Error('Branch.io error'),
      );

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap',
        route: DeepLinkRoute.SWAP,
        urlParams: {},
        signatureStatus: SignatureStatus.MISSING,
        interstitialShown: false,
        interstitialDisabled: false,
      };

      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();

      expect(result.properties.was_app_installed).toBe(true);
      expect(result.properties.route).toBe('swap');
      expect(result.properties.signature).toBe(SignatureStatus.MISSING);
    });

    it('uses route from context instead of recalculating from URL', async () => {
      mockDetectAppInstallation.mockResolvedValue(true);

      // URL says "swap" but context says "perps" - context should win
      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap?from=ETH',
        route: DeepLinkRoute.PERPS, // Different from URL path
        urlParams: {
          symbol: 'BTC',
          screen: 'markets',
        },
        signatureStatus: SignatureStatus.VALID,
        interstitialShown: true,
        interstitialDisabled: false,
        interstitialAction: InterstitialState.ACCEPTED,
      };

      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();

      expect(result.properties.route).toBe('perps');
      expect(result.sensitiveProperties).toEqual({
        symbol: 'BTC',
        screen: 'markets',
      });
    });

    it('passes branchParams to detectAppInstallation when available', async () => {
      // Mock Branch.io to verify detectAppInstallation uses provided params
      const mockBranch = jest.requireMock('react-native-branch');
      mockBranch.getLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': false,
        '+is_first_session': false,
      });

      const branchParams = {
        '+clicked_branch_link': true,
        '+is_first_session': true,
      };

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap',
        route: DeepLinkRoute.SWAP,
        branchParams,
        urlParams: {},
        signatureStatus: SignatureStatus.MISSING,
        interstitialShown: false,
        interstitialDisabled: false,
      };

      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();

      // Verify was_app_installed is false (deferred deep link) - meaning branchParams were used
      expect(result.properties.was_app_installed).toBe(false);
      // Verify Branch.io was NOT called (params were reused)
      expect(mockBranch.getLatestReferringParams).not.toHaveBeenCalled();
    });

    it('calls detectAppInstallation without params when branchParams is undefined', async () => {
      // Mock Branch.io to return app already installed
      const mockBranch = jest.requireMock('react-native-branch');
      mockBranch.getLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': true,
        '+is_first_session': false,
      });

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap',
        route: DeepLinkRoute.SWAP,
        branchParams: undefined,
        urlParams: {},
        signatureStatus: SignatureStatus.MISSING,
        interstitialShown: false,
        interstitialDisabled: false,
      };

      const eventBuilder = await createDeepLinkUsedEventBuilder(context);
      const result = eventBuilder.build();

      // Verify was_app_installed is true (app already installed) - meaning Branch.io was called
      expect(result.properties.was_app_installed).toBe(true);
      // Verify Branch.io WAS called (no params provided)
      expect(mockBranch.getLatestReferringParams).toHaveBeenCalled();
    });
  });

  describe('detectAppInstallation', () => {
    let mockBranch: {
      getLatestReferringParams: jest.Mock;
    };
    let actualDetectAppInstallation: typeof detectAppInstallation;

    beforeEach(() => {
      jest.clearAllMocks();
      mockBranch = jest.requireMock('react-native-branch');
      // Get the actual implementation, not the mock
      const actualModule = jest.requireActual('./deepLinkAnalytics');
      actualDetectAppInstallation = actualModule.detectAppInstallation;
    });

    it('uses provided branchParams instead of fetching when available', async () => {
      const branchParams = {
        '+clicked_branch_link': true,
        '+is_first_session': true,
      };

      const result = await actualDetectAppInstallation(branchParams);

      expect(result).toBe(false); // Deferred deep link
      expect(mockBranch.getLatestReferringParams).not.toHaveBeenCalled();
    });

    it('fetches from Branch.io when branchParams not provided', async () => {
      mockBranch.getLatestReferringParams.mockResolvedValue({
        '+clicked_branch_link': true,
        '+is_first_session': false,
      });

      const result = await actualDetectAppInstallation();

      expect(result).toBe(true); // App already installed
      expect(mockBranch.getLatestReferringParams).toHaveBeenCalled();
    });

    it('defaults to app installed when Branch.io fetch fails', async () => {
      mockBranch.getLatestReferringParams.mockRejectedValue(
        new Error('Branch.io error'),
      );

      const result = await actualDetectAppInstallation();

      expect(result).toBe(true);
    });
  });
});
