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
  createDeepLinkUsedEvent,
} from './deepLinkAnalytics';
import { ACTIONS } from '../../../constants/deeplinks';
import {
  DeepLinkRoute,
  InterstitialState,
  SignatureStatus,
  DeepLinkAnalyticsContext,
} from '../types/deepLinkAnalytics';

// Mock Logger to avoid console output during tests
jest.mock('../../../util/Logger', () => ({
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
    it('returns false for deferred deep link (first session from Branch link)', () => {
      const params = {
        '+is_first_session': true,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(false);
    });

    it('returns true for returning user from Branch link', () => {
      const params = {
        '+is_first_session': false,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 1,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('returns true for direct app launch (not from Branch link)', () => {
      const params = {
        '+is_first_session': false,
        '+clicked_branch_link': false,
        BNCUpdateStateInstall: 1,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('returns true when no params are available (default case)', () => {
      const result = determineAppInstallationStatus(null);

      expect(result).toBe(true);
    });

    it('returns true when params are empty object', () => {
      const result = determineAppInstallationStatus({});

      expect(result).toBe(true);
    });

    it('handles undefined clicked_branch_link', () => {
      const params = {
        '+is_first_session': true,
        '+clicked_branch_link': undefined,
        BNCUpdateStateInstall: 0,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('handles missing is_first_session', () => {
      const params = {
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      };

      const result = determineAppInstallationStatus(params);

      expect(result).toBe(true);
    });

    it('returns true for invalid params', () => {
      const result = determineAppInstallationStatus('invalid-params');

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

    it('extracts common properties for all routes', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.SWAP,
        mockUrlParams,
      );

      expect(result.from).toBe('ETH');
      expect(result.to).toBe('USDC');
      expect(result.amount).toBe('100');
      expect(result.asset).toBe('ETH');
    });

    it('extracts swap-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.SWAP,
        mockUrlParams,
      );

      expect(result.slippage).toBe('0.5');
      expect(result.symbol).toBeUndefined();
    });

    it('extracts perps-specific properties', () => {
      const result = extractSensitiveProperties(
        DeepLinkRoute.PERPS,
        mockUrlParams,
      );

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

    it('returns empty object for home and invalid routes', () => {
      const homeResult = extractSensitiveProperties(
        DeepLinkRoute.HOME,
        mockUrlParams,
      );
      const invalidResult = extractSensitiveProperties(
        DeepLinkRoute.INVALID,
        mockUrlParams,
      );

      expect(homeResult).toEqual({});
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

    it('return SKIPPED when user disabled interstitials', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialDisabled: true,
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.SKIPPED);
    });

    it('return ACCEPTED when user accepted the interstitial', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialAction: 'accepted',
      });

      const result = determineInterstitialState(context);
      expect(result).toBe(InterstitialState.ACCEPTED);
    });

    it('return REJECTED when user rejected the interstitial', () => {
      const context = createMockContext({
        interstitialShown: true,
        interstitialAction: 'rejected',
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
    it('map swap action to SWAP route', () => {
      const result = mapSupportedActionToRoute(ACTIONS.SWAP);
      expect(result).toBe(DeepLinkRoute.SWAP);
    });

    it('map perps actions to PERPS route', () => {
      expect(mapSupportedActionToRoute(ACTIONS.PERPS)).toBe(DeepLinkRoute.PERPS);
      expect(mapSupportedActionToRoute(ACTIONS.PERPS_MARKETS)).toBe(DeepLinkRoute.PERPS);
      expect(mapSupportedActionToRoute(ACTIONS.PERPS_ASSET)).toBe(DeepLinkRoute.PERPS);
    });

    it('map deposit action to DEPOSIT route', () => {
      const result = mapSupportedActionToRoute(ACTIONS.DEPOSIT);
      expect(result).toBe(DeepLinkRoute.DEPOSIT);
    });

    it('map send action to TRANSACTION route', () => {
      const result = mapSupportedActionToRoute(ACTIONS.SEND);
      expect(result).toBe(DeepLinkRoute.TRANSACTION);
    });

    it('map buy actions to BUY route', () => {
      expect(mapSupportedActionToRoute(ACTIONS.BUY)).toBe(DeepLinkRoute.BUY);
      expect(mapSupportedActionToRoute(ACTIONS.BUY_CRYPTO)).toBe(DeepLinkRoute.BUY);
    });

    it('map home action to HOME route', () => {
      expect(mapSupportedActionToRoute(ACTIONS.HOME)).toBe(DeepLinkRoute.HOME);
    });

    it('map unsupported actions to INVALID route', () => {
      expect(mapSupportedActionToRoute(ACTIONS.DAPP)).toBe(DeepLinkRoute.INVALID);
      expect(mapSupportedActionToRoute(ACTIONS.WC)).toBe(DeepLinkRoute.INVALID);
      expect(mapSupportedActionToRoute(ACTIONS.CREATE_ACCOUNT)).toBe(DeepLinkRoute.INVALID);
    });
  });

  describe('extractRouteFromUrl', () => {
    it('extract swap route', () => {
      const result = extractRouteFromUrl(
        'https://link.metamask.io/swap?from=ETH',
      );
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

  describe('createDeepLinkUsedEvent', () => {
    let mockDetectAppInstallation: jest.MockedFunction<any>;

    beforeEach(() => {
      jest.clearAllMocks();
      const deepLinkAnalytics = require('./deepLinkAnalytics');
      mockDetectAppInstallation = deepLinkAnalytics.detectAppInstallation;
    });

    it('create event with correct properties for swap route', async () => {
      mockDetectAppInstallation.mockResolvedValue(true);

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/swap?from=ETH&to=USDC&amount=100',
        route: DeepLinkRoute.SWAP,
        urlParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '100',
          utm_source: 'twitter',
          utm_campaign: 'swap_promo',
        },
        signatureStatus: SignatureStatus.MISSING,
        interstitialShown: true,
        interstitialDisabled: false,
        interstitialAction: 'accepted',
      };

      const result = await createDeepLinkUsedEvent(context);

      expect(result.route).toBe('swap');
      expect(result.was_app_installed).toBe(true);
      expect(result.signature).toBe(SignatureStatus.MISSING);
      expect(result.interstitial).toBe(InterstitialState.ACCEPTED);
      expect(result.utm_source).toBe('twitter');
      expect(result.utm_campaign).toBe('swap_promo');
      expect(result.sensitiveProperties).toEqual({
        from: 'ETH',
        to: 'USDC',
        amount: '100',
        slippage: '0.5',
      });
    });

    it('create event for invalid route with target URL', async () => {
      // Mock the Branch.io getLatestReferringParams to return deferred deep link params
      const mockBranch = require('react-native-branch');
      mockBranch.getLatestReferringParams.mockResolvedValue({
        '+is_first_session': true,
        '+clicked_branch_link': true,
        BNCUpdateStateInstall: 0,
      });

      const context: DeepLinkAnalyticsContext = {
        url: 'https://link.metamask.io/invalid-route?test=param',
        route: DeepLinkRoute.INVALID,
        urlParams: { test: 'param' },
        signatureStatus: SignatureStatus.INVALID,
        interstitialShown: false,
        interstitialDisabled: false,
      };

      const result = await createDeepLinkUsedEvent(context);

      expect(result.route).toBe('invalid');
      expect(result.was_app_installed).toBe(false);
      expect(result.signature).toBe(SignatureStatus.INVALID);
      expect(result.target).toBe(
        'https://link.metamask.io/invalid-route?test=param',
      );
    });

    it('returns default values when Branch.io throws error', async () => {
      const mockBranch = require('react-native-branch');
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

      const result = await createDeepLinkUsedEvent(context);

      expect(result).toBeDefined();
      expect(result.was_app_installed).toBe(true);
    });
  });
});
