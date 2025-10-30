import { LegacyLinkAdapter } from './LegacyLinkAdapter';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import AppConstants from '../../AppConstants';
import { ACTIONS } from '../../../constants/deeplinks';

jest.mock('../CoreLinkNormalizer');

describe('LegacyLinkAdapter', () => {
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toLegacyFormat', () => {
    it('converts CoreUniversalLink to legacy format with all parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'connect',
        params: {
          channelId: '123',
          comm: 'socket',
          pubkey: 'abc',
          v: '2',
          hr: true,
          utm_source: 'twitter',
          message: 'Hello',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect?channelId=123',
        normalizedUrl: 'metamask://connect?channelId=123',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.params.channelId).toBe('123');
      expect(result.params.comm).toBe('socket');
      expect(result.params.pubkey).toBe('abc');
      expect(result.params.v).toBe('2');
      expect(result.params.hr).toBe(true);
      expect(result.params.utm_source).toBe('twitter');
      expect(result.params.message).toBe('Hello');
      expect(result.urlObj).toBeDefined();
    });

    it('converts hr boolean to boolean in legacy format', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {
          hr: false,
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'metamask://home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.params.hr).toBe(false);
    });

    it('handles empty parameters gracefully', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'metamask://home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.params.uri).toBe('');
      expect(result.params.redirect).toBe('');
      expect(result.params.channelId).toBe('');
      expect(result.params.comm).toBe('');
      expect(result.params.pubkey).toBe('');
      expect(result.params.hr).toBe(false);
    });

    it('converts https protocol links correctly', () => {
      const link: CoreUniversalLink = {
        protocol: 'https',
        host: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        action: 'swap',
        params: {
          from: 'ETH',
          to: 'DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap`,
        normalizedUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.urlObj.hostname).toBe(
        AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
      );
      expect(result.urlObj.pathname).toBe('/swap');
    });
  });

  describe('fromLegacyFormat', () => {
    beforeEach(() => {
      (CoreLinkNormalizer.normalize as jest.Mock).mockImplementation(
        (url, source) => ({
          protocol: url.startsWith('metamask://') ? 'metamask' : 'https',
          action: 'test-action',
          params: {},
          source,
          timestamp: mockTimestamp,
          originalUrl: url,
          normalizedUrl: url,
          isValid: true,
          isSupportedAction: true,
          isPrivateLink: false,
          requiresAuth: false,
        }),
      );
    });

    it('converts legacy format to CoreUniversalLink', () => {
      const url = 'metamask://connect?channelId=123';
      const params: DeeplinkUrlParams = {
        uri: 'test-uri',
        redirect: 'test-redirect',
        channelId: '123',
        comm: 'socket',
        pubkey: 'abc',
        hr: true,
        scheme: 'test-scheme',
        v: '2',
        rpc: 'test-rpc',
        sdkVersion: '1.0',
        message: 'Hello',
        originatorInfo: 'test-info',
        request: 'test-request',
        attributionId: 'test-attr',
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'launch',
        utm_term: 'test',
        utm_content: 'content',
        account: '0x123@1',
      };
      const source = 'test';

      const result = LegacyLinkAdapter.fromLegacyFormat(url, params, source);

      expect(result.params.channelId).toBe('123');
      expect(result.params.comm).toBe('socket');
      expect(result.params.pubkey).toBe('abc');
      expect(result.params.hr).toBe(true);
      expect(result.params.utm_source).toBe('twitter');
      expect(result.params.account).toBe('0x123@1');
      expect(result.source).toBe(source);
    });

    it('handles undefined optional parameters', () => {
      const url = 'metamask://home';
      const params: DeeplinkUrlParams = {
        uri: '',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        hr: false,
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        attributionId: '',
      };
      const source = 'test';

      const result = LegacyLinkAdapter.fromLegacyFormat(url, params, source);

      expect(result.params.uri).toBeUndefined();
      expect(result.params.hr).toBe(false);
    });

    it('preserves hr boolean value', () => {
      const url = 'metamask://home';
      const params: DeeplinkUrlParams = {
        uri: '',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        hr: true,
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        attributionId: '',
      };
      const source = 'test';

      const result = LegacyLinkAdapter.fromLegacyFormat(url, params, source);

      expect(result.params.hr).toBe(true);
    });
  });

  describe('shouldUseNewSystem', () => {
    it('returns false by default for backward compatibility', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'metamask://swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.shouldUseNewSystem(link);

      expect(result).toBe(false);
    });

    it('returns false for all action types currently', () => {
      const actions = ['home', 'swap', 'send', 'dapp', 'perps'];

      actions.forEach((action) => {
        const link: CoreUniversalLink = {
          protocol: 'metamask',
          action,
          params: {},
          source: 'test',
          timestamp: mockTimestamp,
          originalUrl: `metamask://${action}`,
          normalizedUrl: `metamask://${action}`,
          isValid: true,
          isSupportedAction: true,
          isPrivateLink: false,
          requiresAuth: false,
        };

        expect(LegacyLinkAdapter.shouldUseNewSystem(link)).toBe(false);
      });
    });
  });

  describe('wrapHandler', () => {
    it('wraps a synchronous handler function', () => {
      const mockHandler = jest.fn();
      const paramExtractor = (link: CoreUniversalLink) => ({
        swapPath: link.params.swapPath || '',
      });

      const wrappedHandler = LegacyLinkAdapter.wrapHandler(
        mockHandler,
        paramExtractor,
      );

      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          swapPath: 'swap?from=ETH&to=DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'metamask://swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      wrappedHandler(link);

      expect(mockHandler).toHaveBeenCalledWith({
        swapPath: 'swap?from=ETH&to=DAI',
      });
    });

    it('wraps an asynchronous handler function', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const paramExtractor = (link: CoreUniversalLink) => ({
        perpsPath: link.params.perpsPath || '',
      });

      const wrappedHandler = LegacyLinkAdapter.wrapHandler(
        mockHandler,
        paramExtractor,
      );

      const link: CoreUniversalLink = {
        protocol: 'https',
        action: 'perps',
        params: {
          perpsPath: 'perps/markets',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'https://example.com/perps',
        normalizedUrl: 'https://example.com/perps',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      await wrappedHandler(link);

      expect(mockHandler).toHaveBeenCalledWith({
        perpsPath: 'perps/markets',
      });
    });

    it('passes through errors from wrapped handler', async () => {
      const error = new Error('Handler error');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const paramExtractor = (_link: CoreUniversalLink) => ({ test: 'value' });

      const wrappedHandler = LegacyLinkAdapter.wrapHandler(
        mockHandler,
        paramExtractor,
      );

      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'test',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://test',
        normalizedUrl: 'metamask://test',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      await expect(wrappedHandler(link)).rejects.toThrow(error);
    });
  });

  describe('extractActionParams', () => {
    it('extracts swap path parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          swapPath: 'swap?from=ETH&to=DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'metamask://swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result.swapPath).toBe('swap?from=ETH&to=DAI');
      expect(result.perpsPath).toBeUndefined();
    });

    it('extracts perps path parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'https',
        action: ACTIONS.PERPS,
        params: {
          perpsPath: 'perps/markets',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'https://example.com/perps',
        normalizedUrl: 'https://example.com/perps',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result.perpsPath).toBe('perps/markets');
      expect(result.swapPath).toBeUndefined();
    });

    it('extracts ramp-related path parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.BUY_CRYPTO,
        params: {
          rampPath: 'buy-crypto?amount=100',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://buy-crypto',
        normalizedUrl: 'metamask://buy-crypto',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result.rampPath).toBe('buy-crypto?amount=100');
    });

    it('extracts dapp path parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.DAPP,
        params: {
          dappPath: 'dapp/app.uniswap.org',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://dapp',
        normalizedUrl: 'metamask://dapp',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result.dappPath).toBe('dapp/app.uniswap.org');
    });

    it('returns empty object for unsupported actions', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'unknown',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://unknown',
        normalizedUrl: 'metamask://unknown',
        isValid: false,
        isSupportedAction: false,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({});
    });

    it('extracts multiple path parameters for perps actions', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.PERPS_ASSET,
        params: {
          perpsPath: 'perps-asset/ETH-USD',
          perpsAssetPath: 'perps-asset/ETH-USD',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://perps-asset',
        normalizedUrl: 'metamask://perps-asset',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result.perpsPath).toBe('perps-asset/ETH-USD');
      expect(result.perpsAssetPath).toBe('perps-asset/ETH-USD');
    });
  });

  describe('buildLegacyUrl', () => {
    it('builds metamask protocol URLs', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          from: 'ETH',
          to: 'DAI',
          amount: '100',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'metamask://swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.buildLegacyUrl(link);

      expect(result).toBe('metamask://swap?from=ETH&to=DAI&amount=100');
    });

    it('builds https protocol URLs', () => {
      const link: CoreUniversalLink = {
        protocol: 'https',
        host: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        action: 'send',
        params: {
          to: '0x123',
          value: '1',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/send`,
        normalizedUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/send`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: true,
      };

      const result = LegacyLinkAdapter.buildLegacyUrl(link);

      expect(result).toBe(
        `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/send?to=0x123&value=1`,
      );
    });

    it('converts boolean hr parameter to string', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {
          hr: true,
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'metamask://home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.buildLegacyUrl(link);

      expect(result).toBe('metamask://home?hr=1');
    });

    it('filters out action-specific path parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          swapPath: 'swap?from=ETH',
          from: 'ETH',
          to: 'DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'metamask://swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.buildLegacyUrl(link);

      expect(result).toBe('metamask://swap?from=ETH&to=DAI');
      expect(result).not.toContain('swapPath');
    });

    it('handles empty parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'metamask://home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.buildLegacyUrl(link);

      expect(result).toBe('metamask://home');
    });
  });

  describe('extractPathFromUrl', () => {
    it('extracts path with query parameters', () => {
      const url = 'https://example.com/swap/test?from=ETH&to=DAI';
      const action = 'swap';

      const result = LegacyLinkAdapter.extractPathFromUrl(url, action);

      expect(result).toBe('swap/test?from=ETH&to=DAI');
    });

    it('extracts path without query parameters', () => {
      const url = 'https://example.com/perps/markets';
      const action = 'perps';

      const result = LegacyLinkAdapter.extractPathFromUrl(url, action);

      expect(result).toBe('perps/markets');
    });

    it('returns action when no additional path', () => {
      const url = 'metamask://home';
      const action = 'home';

      const result = LegacyLinkAdapter.extractPathFromUrl(url, action);

      expect(result).toBe('home');
    });

    it('handles action not in path', () => {
      const url = 'https://example.com/other/path';
      const action = 'swap';

      const result = LegacyLinkAdapter.extractPathFromUrl(url, action);

      expect(result).toBe('swap/other/path');
    });
  });
});
