import { LegacyLinkAdapter } from './LegacyLinkAdapter';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';
import { ACTIONS } from '../../../constants/deeplinks';

// Mock the CoreLinkNormalizer
jest.mock('../CoreLinkNormalizer', () => ({
  CoreLinkNormalizer: {
    normalize: jest.fn((url: string, source: string) => ({
      protocol: 'metamask',
      action: 'swap',
      params: {},
      source,
      timestamp: Date.now(),
      originalUrl: url,
      normalizedUrl: url,
      isValid: true,
      isSupportedAction: true,
      isPrivateLink: false,
      requiresAuth: false,
    })),
  },
}));

describe('LegacyLinkAdapter', () => {
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('toLegacyFormat', () => {
    it('converts CoreUniversalLink to legacy format with all parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.CONNECT,
        params: {
          channelId: '123',
          comm: 'socket',
          pubkey: 'abc123',
          scheme: 'https',
          v: '2',
          rpc: 'https://rpc.example.com',
          sdkVersion: '1.0.0',
          message: 'Hello%20World',
          originatorInfo: 'app.example.com',
          request: 'sign',
          redirect: 'true',
          hr: true,
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect',
        normalizedUrl: 'metamask://connect',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result).toMatchObject({
        uri: 'metamask://connect',
        redirect: 'true',
        channelId: '123',
        comm: 'socket',
        pubkey: 'abc123',
        scheme: 'https',
        v: '2',
        rpc: 'https://rpc.example.com',
        sdkVersion: '1.0.0',
        message: 'Hello+World',
        originatorInfo: 'app.example.com',
        request: 'sign',
        hr: true,
      });
    });

    it('handles missing optional parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
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

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result).toMatchObject({
        uri: 'metamask://swap',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        hr: false,
      });
      expect(result.scheme).toBeUndefined();
      expect(result.v).toBeUndefined();
    });

    it('preserves SDK parameters correctly', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.MMSDK,
        params: {
          channelId: 'sdk-123',
          pubkey: 'public-key',
          comm: 'deeplinking',
          sdkVersion: '2.0.0',
        },
        source: 'sdk',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://mmsdk',
        normalizedUrl: 'metamask://mmsdk',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: true,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.channelId).toBe('sdk-123');
      expect(result.pubkey).toBe('public-key');
      expect(result.comm).toBe('deeplinking');
      expect(result.sdkVersion).toBe('2.0.0');
    });

    it('converts boolean hr to legacy format', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.HOME,
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

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.hr).toBe(true);
    });

    it('converts message parameter with %20 to + for legacy format', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.CONNECT,
        params: {
          message: 'Hello%20World',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect',
        normalizedUrl: 'metamask://connect',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(link);

      expect(result.message).toBe('Hello+World');
    });
  });

  describe('fromLegacyFormat', () => {
    it('converts legacy params to CoreUniversalLink', () => {
      const legacyParams: DeeplinkUrlParams = {
        uri: 'metamask://swap',
        redirect: '',
        channelId: '123',
        comm: 'socket',
        pubkey: 'abc',
        hr: true,
      } as DeeplinkUrlParams;

      const result = LegacyLinkAdapter.fromLegacyFormat(
        legacyParams,
        'metamask://swap',
        'legacy',
      );

      expect(result.source).toBe('legacy');
      expect(result.originalUrl).toBe('metamask://swap');
      expect(result.params.channelId).toBe('123');
      expect(result.params.comm).toBe('socket');
      expect(result.params.pubkey).toBe('abc');
      expect(result.params.hr).toBe(true);
    });

    it('filters out empty string values', () => {
      const legacyParams: DeeplinkUrlParams = {
        uri: 'metamask://home',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        scheme: 'https',
        hr: false,
      } as DeeplinkUrlParams;

      const result = LegacyLinkAdapter.fromLegacyFormat(
        legacyParams,
        'metamask://home',
      );

      expect(result.params.redirect).toBeUndefined();
      expect(result.params.channelId).toBeUndefined();
      expect(result.params.comm).toBeUndefined();
      expect(result.params.pubkey).toBeUndefined();
      expect(result.params.scheme).toBe('https');
      expect(result.params.hr).toBe(false);
    });

    it('converts message with + back to spaces', () => {
      const legacyParams: DeeplinkUrlParams = {
        uri: 'metamask://connect',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        message: 'Hello+World',
        hr: false,
      } as DeeplinkUrlParams;

      const result = LegacyLinkAdapter.fromLegacyFormat(
        legacyParams,
        'metamask://connect',
      );

      expect(result.params.message).toBe('Hello World');
    });
  });

  describe('shouldUseNewSystem', () => {
    it('returns true for whitelisted actions', () => {
      const whitelistedActions = [
        ACTIONS.HOME,
        ACTIONS.SWAP,
        ACTIONS.SEND,
        ACTIONS.DAPP,
        ACTIONS.RAMP,
      ];

      whitelistedActions.forEach((action) => {
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

        expect(LegacyLinkAdapter.shouldUseNewSystem(link)).toBe(true);
      });
    });

    it('returns false for non-whitelisted actions', () => {
      const nonWhitelistedActions = [
        ACTIONS.CONNECT,
        ACTIONS.MMSDK,
        ACTIONS.WC,
        'unknown-action',
      ];

      nonWhitelistedActions.forEach((action) => {
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
    it('wraps legacy handler successfully', async () => {
      const legacyHandler = jest.fn();
      const wrapped = LegacyLinkAdapter.wrapHandler(legacyHandler);

      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
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

      await wrapped(link);

      expect(legacyHandler).toHaveBeenCalledTimes(1);
      expect(legacyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'metamask://swap',
          hr: false,
        }),
      );
    });

    it('passes converted parameters to legacy handler', async () => {
      const legacyHandler = jest.fn();
      const wrapped = LegacyLinkAdapter.wrapHandler(legacyHandler);

      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.CONNECT,
        params: {
          channelId: '123',
          pubkey: 'abc',
          hr: true,
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect',
        normalizedUrl: 'metamask://connect',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      await wrapped(link);

      const calledWith = legacyHandler.mock.calls[0][0];
      expect(calledWith.channelId).toBe('123');
      expect(calledWith.pubkey).toBe('abc');
      expect(calledWith.hr).toBe(true);
    });

    it('propagates errors from legacy handler', async () => {
      const error = new Error('Legacy handler error');
      const legacyHandler = jest.fn().mockRejectedValue(error);
      const wrapped = LegacyLinkAdapter.wrapHandler(legacyHandler);

      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
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

      await expect(wrapped(link)).rejects.toThrow('Legacy handler error');
    });
  });

  describe('extractActionParams', () => {
    it('extracts swap parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          from: 'ETH',
          to: 'DAI',
          amount: '100',
          slippage: '1',
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

      expect(result).toEqual({
        from: 'ETH',
        to: 'DAI',
        amount: '100',
        slippage: '1',
        sourceToken: undefined,
        destinationToken: undefined,
      });
    });

    it('extracts send parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SEND,
        params: {
          to: '0x123',
          value: '1000000000000000000',
          data: '0xabc',
          gasLimit: '21000',
          gasPrice: '20000000000',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://send',
        normalizedUrl: 'metamask://send',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: true,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        to: '0x123',
        value: '1000000000000000000',
        data: '0xabc',
        gasLimit: '21000',
        gasPrice: '20000000000',
        from: undefined,
      });
    });

    it('extracts dapp parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.DAPP,
        params: {
          dappPath: 'dapp/app.uniswap.org?chain=1',
          chain: '1',
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

      expect(result).toEqual({
        url: 'app.uniswap.org',
        chain: '1',
        chainId: undefined,
      });
    });

    it('extracts ramp parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.BUY_CRYPTO,
        params: {
          amount: '100',
          currency: 'ETH',
          fiatCurrency: 'USD',
          chainId: '1',
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

      expect(result).toEqual({
        amount: '100',
        currency: 'ETH',
        fiatCurrency: 'USD',
        chainId: '1',
        address: undefined,
      });
    });

    it('extracts SDK connect parameters', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.CONNECT,
        params: {
          channelId: '123',
          pubkey: 'abc',
          comm: 'socket',
          v: '2',
          sdkVersion: '1.0.0',
        },
        source: 'sdk',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect',
        normalizedUrl: 'metamask://connect',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        channelId: '123',
        pubkey: 'abc',
        comm: 'socket',
        redirect: undefined,
        v: '2',
        sdkVersion: '1.0.0',
        originatorInfo: undefined,
      });
    });

    it('returns empty object for unknown actions', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'unknown-action',
        params: {
          test: 'value',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://unknown-action',
        normalizedUrl: 'metamask://unknown-action',
        isValid: false,
        isSupportedAction: false,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        test: 'value',
      });
    });
  });

  describe('isPrivateLink', () => {
    it('identifies private links with SDK parameters', () => {
      const params: DeeplinkUrlParams = {
        uri: 'metamask://connect',
        redirect: '',
        channelId: '123',
        comm: '',
        pubkey: 'abc',
        hr: false,
      } as DeeplinkUrlParams;

      expect(LegacyLinkAdapter.isPrivateLink(params)).toBe(true);
    });

    it('identifies private links with originatorInfo', () => {
      const params: DeeplinkUrlParams = {
        uri: 'metamask://mmsdk',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        originatorInfo: 'app.example.com',
        hr: false,
      } as DeeplinkUrlParams;

      expect(LegacyLinkAdapter.isPrivateLink(params)).toBe(true);
    });

    it('identifies non-private links', () => {
      const params: DeeplinkUrlParams = {
        uri: 'metamask://swap',
        redirect: '',
        channelId: '',
        comm: '',
        pubkey: '',
        hr: false,
      } as DeeplinkUrlParams;

      expect(LegacyLinkAdapter.isPrivateLink(params)).toBe(false);
    });
  });

  describe('getActionUrl', () => {
    it('reconstructs URL from action-specific path', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          swapPath: 'swap?from=ETH&to=DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap?from=ETH&to=DAI',
        normalizedUrl: 'metamask://swap?from=ETH&to=DAI',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.getActionUrl(link);

      expect(result).toBe('metamask://swap?from=ETH&to=DAI');
    });

    it('returns original URL when no action path found', () => {
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.HOME,
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

      const result = LegacyLinkAdapter.getActionUrl(link);

      expect(result).toBe('metamask://home');
    });
  });
});
