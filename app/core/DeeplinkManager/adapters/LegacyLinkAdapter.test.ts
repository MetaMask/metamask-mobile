import { LegacyLinkAdapter } from './LegacyLinkAdapter';
import { CoreUniversalLink, CoreLinkParams } from '../types/CoreUniversalLink';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import AppConstants from '../../AppConstants';

// Mock CoreLinkNormalizer
jest.mock('../CoreLinkNormalizer');
const mockNormalize = CoreLinkNormalizer.normalize as jest.MockedFunction<typeof CoreLinkNormalizer.normalize>;
const mockToMetaMaskProtocol = CoreLinkNormalizer.toMetaMaskProtocol as jest.MockedFunction<typeof CoreLinkNormalizer.toMetaMaskProtocol>;

describe('LegacyLinkAdapter', () => {
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toLegacyFormat', () => {
    it('converts CoreUniversalLink to legacy format', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          from: 'ETH',
          to: 'DAI',
          amount: '100',
          hr: true,
          swapPath: 'swap?from=ETH&to=DAI&amount=100',
        },
        source: 'qr-code',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap?from=ETH&to=DAI&amount=100',
        normalizedUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI&amount=100`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect(result.urlObj.href).toBe(coreLink.normalizedUrl);
      expect(result.params.hr).toBe(true);
      expect(result.params.uri).toBe('');
      expect(result.params.redirect).toBe('');
      // Custom params should be included
      expect((result.params as unknown as Record<string, unknown>).from).toBe('ETH');
      expect((result.params as unknown as Record<string, unknown>).to).toBe('DAI');
      expect((result.params as unknown as Record<string, unknown>).amount).toBe('100');
    });

    it('handles SDK parameters correctly', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'connect',
        params: {
          channelId: '123',
          comm: 'socket',
          pubkey: 'abc',
          v: '2',
          sdkVersion: '1.0',
        },
        source: 'sdk',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://connect',
        normalizedUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/connect`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect(result.params.channelId).toBe('123');
      expect(result.params.comm).toBe('socket');
      expect(result.params.pubkey).toBe('abc');
      expect(result.params.v).toBe('2');
      expect(result.params.sdkVersion).toBe('1.0');
    });

    it('includes all custom parameters', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: 'dapp',
        params: {
          customParam1: 'value1',
          customParam2: 'value2',
          uri: 'https://app.uniswap.org',
        } as CoreLinkParams,
        source: 'browser',
        timestamp: mockTimestamp,
        originalUrl: 'https://link.metamask.io/dapp/app.uniswap.org',
        normalizedUrl: 'https://link.metamask.io/dapp/app.uniswap.org',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect((result.params as unknown as Record<string, unknown>).customParam1).toBe('value1');
      expect((result.params as unknown as Record<string, unknown>).customParam2).toBe('value2');
      expect(result.params.uri).toBe('https://app.uniswap.org');
    });
  });

  describe('fromLegacyFormat', () => {
    it('converts legacy URL to CoreUniversalLink', () => {
      const url = 'metamask://swap?from=ETH&to=DAI';
      const source = 'test';
      const mockCoreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: { from: 'ETH', to: 'DAI' },
        source,
        timestamp: mockTimestamp,
        originalUrl: url,
        normalizedUrl: url,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      mockNormalize.mockReturnValue(mockCoreLink);

      const result = LegacyLinkAdapter.fromLegacyFormat(url, source);

      expect(mockNormalize).toHaveBeenCalledWith(url, source);
      expect(result).toBe(mockCoreLink);
    });

    it('merges additional legacy params', () => {
      const url = 'metamask://send';
      const source = 'legacy';
      const additionalParams = {
        to: '0x123',
        value: '1000',
        hr: true,
      };

      const mockCoreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'send',
        params: {},
        source,
        timestamp: mockTimestamp,
        originalUrl: url,
        normalizedUrl: url,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: true,
      };

      mockNormalize.mockReturnValue(mockCoreLink);

      const result = LegacyLinkAdapter.fromLegacyFormat(url, source, additionalParams);

      expect(result.params.to).toBe('0x123');
      expect(result.params.value).toBe('1000');
      expect(result.params.hr).toBe(true);
    });

    it('filters out null and empty params when merging', () => {
      const url = 'metamask://home';
      const source = 'test';
      const additionalParams = {
        param1: 'value',
        param2: null,
        param3: '',
        param4: undefined,
      };

      const mockCoreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source,
        timestamp: mockTimestamp,
        originalUrl: url,
        normalizedUrl: url,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      mockNormalize.mockReturnValue(mockCoreLink);

      const result = LegacyLinkAdapter.fromLegacyFormat(url, source, additionalParams as Record<string, unknown>);

      expect(result.params.param1).toBe('value');
      expect(result.params.param2).toBeUndefined();
      expect(result.params.param3).toBeUndefined();
      expect(result.params.param4).toBeUndefined();
    });
  });

  describe('shouldUseNewSystem', () => {
    it('returns true for new system actions', () => {
      expect(LegacyLinkAdapter.shouldUseNewSystem('home')).toBe(true);
      expect(LegacyLinkAdapter.shouldUseNewSystem('swap')).toBe(true);
    });

    it('returns false for actions not yet migrated', () => {
      expect(LegacyLinkAdapter.shouldUseNewSystem('send')).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem('connect')).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem('buy-crypto')).toBe(false);
    });
  });

  describe('wrapHandler', () => {
    it('wraps legacy handler to accept CoreUniversalLink', () => {
      const mockHandler = jest.fn();
      const wrapped = LegacyLinkAdapter.wrapHandler(mockHandler);

      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: { from: 'ETH' },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap?from=ETH',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const context = {
        instance: {},
        handled: jest.fn(),
        browserCallBack: jest.fn(),
      };

      wrapped(coreLink, context);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          instance: context.instance,
          handled: context.handled,
          browserCallBack: context.browserCallBack,
          origin: 'test',
          url: 'metamask://swap?from=ETH',
          urlObj: expect.any(Object),
          params: expect.objectContaining({
            uri: '',
            redirect: '',
          }),
        }),
      );
    });
  });

  describe('extractActionParams', () => {
    it('extracts swap action parameters', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          from: 'ETH',
          to: 'DAI',
          swapPath: 'swap?from=ETH&to=DAI',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: '',
        normalizedUrl: '',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(coreLink);

      expect(result.path).toBe('?from=ETH&to=DAI');
      expect(result.params.from).toBe('ETH');
      expect(result.params.to).toBe('DAI');
      expect(result.params.swapPath).toBeUndefined();
    });

    it('extracts ramp action parameters', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: 'buy-crypto',
        params: {
          amount: '100',
          currency: 'USD',
          rampPath: 'buy-crypto?amount=100&currency=USD',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: '',
        normalizedUrl: '',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(coreLink);

      expect(result.path).toBe('?amount=100&currency=USD');
      expect(result.params.amount).toBe('100');
      expect(result.params.currency).toBe('USD');
    });

    it('handles paths with subdirectories', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: 'dapp',
        params: {
          dappPath: 'dapp/app.uniswap.org/swap',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: '',
        normalizedUrl: '',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(coreLink);

      expect(result.path).toBe('app.uniswap.org/swap');
      expect(result.params.dappPath).toBeUndefined();
    });

    it('returns empty path when no action-specific path exists', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {
          hr: true,
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: '',
        normalizedUrl: '',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.extractActionParams(coreLink);

      expect(result.path).toBe('');
      expect(result.params.hr).toBe(true);
    });
  });

  describe('toProtocolUrl', () => {
    it('converts to metamask protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: 'swap',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'https://link.metamask.io/swap',
        normalizedUrl: 'https://link.metamask.io/swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      mockToMetaMaskProtocol.mockReturnValue('metamask://swap');

      const result = LegacyLinkAdapter.toProtocolUrl(coreLink, 'metamask');

      expect(mockToMetaMaskProtocol).toHaveBeenCalledWith(coreLink);
      expect(result).toBe('metamask://swap');
    });

    it('converts to ethereum protocol for send action', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'send',
        params: {
          to: '0x123',
          value: '1000',
          sendPath: 'send/0x123',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://send',
        normalizedUrl: 'https://link.metamask.io/send',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: true,
      };

      const result = LegacyLinkAdapter.toProtocolUrl(coreLink, 'ethereum');

      expect(result).toBe('ethereum:0x123?to=0x123&value=1000');
    });

    it('converts to dapp protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: 'dapp',
        params: {
          dappPath: 'dapp/app.uniswap.org',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'https://link.metamask.io/dapp/app.uniswap.org',
        normalizedUrl: 'https://link.metamask.io/dapp/app.uniswap.org',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toProtocolUrl(coreLink, 'dapp');

      expect(result).toBe('dapp://app.uniswap.org');
    });

    it('returns normalized URL for https protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'https://link.metamask.io/home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.toProtocolUrl(coreLink, 'https');

      expect(result).toBe('https://link.metamask.io/home');
    });
  });

  describe('isEquivalentUrl', () => {
    it('returns true for equivalent URLs', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {
          from: 'ETH',
          to: 'DAI',
          amount: '100',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap?from=ETH&to=DAI&amount=100',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=DAI&amount=100',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const mockNormalizedLegacy: CoreUniversalLink = {
        ...coreLink,
        source: 'comparison',
      };

      mockNormalize.mockReturnValue(mockNormalizedLegacy);

      const result = LegacyLinkAdapter.isEquivalentUrl(
        coreLink,
        'metamask://swap?from=ETH&to=DAI&amount=100',
      );

      expect(result).toBe(true);
    });

    it('returns false for different actions', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'swap',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://swap',
        normalizedUrl: 'https://link.metamask.io/swap',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const mockNormalizedLegacy: CoreUniversalLink = {
        ...coreLink,
        action: 'send',
      };

      mockNormalize.mockReturnValue(mockNormalizedLegacy);

      const result = LegacyLinkAdapter.isEquivalentUrl(coreLink, 'metamask://send');

      expect(result).toBe(false);
    });

    it('returns false for different essential params', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'send',
        params: {
          to: '0x123',
          amount: '100',
        },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://send?to=0x123',
        normalizedUrl: 'https://link.metamask.io/send?to=0x123',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: true,
      };

      const mockNormalizedLegacy: CoreUniversalLink = {
        ...coreLink,
        params: {
          to: '0x456',
          amount: '100',
        },
      };

      mockNormalize.mockReturnValue(mockNormalizedLegacy);

      const result = LegacyLinkAdapter.isEquivalentUrl(coreLink, 'metamask://send?to=0x456');

      expect(result).toBe(false);
    });

    it('handles invalid URLs gracefully', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'https://link.metamask.io/home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      mockNormalize.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      const result = LegacyLinkAdapter.isEquivalentUrl(coreLink, 'not-a-url');

      expect(result).toBe(false);
    });
  });

  describe('createHandlerContext', () => {
    it('creates complete handler context from CoreUniversalLink', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'wc',
        params: {
          uri: 'wc:12345',
          channelId: '123',
        },
        source: 'wallet-connect',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://wc?uri=wc:12345',
        normalizedUrl: 'https://link.metamask.io/wc?uri=wc:12345',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const additionalContext = {
        instance: { id: 'test' },
        handled: jest.fn(),
        browserCallBack: jest.fn(),
      };

      const result = LegacyLinkAdapter.createHandlerContext(coreLink, additionalContext);

      expect(result.instance).toBe(additionalContext.instance);
      expect(result.handled).toBe(additionalContext.handled);
      expect(result.browserCallBack).toBe(additionalContext.browserCallBack);
      expect(result.wcURL).toBe('wc:12345');
      expect(result.origin).toBe('wallet-connect');
      expect(result.url).toBe('metamask://wc?uri=wc:12345');
      expect(result.urlObj).toBeDefined();
      expect(result.params).toBeDefined();
      expect(result.params?.uri).toBe('wc:12345');
      expect(result.params?.channelId).toBe('123');
    });

    it('provides defaults for missing context properties', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: 'metamask://home',
        normalizedUrl: 'https://link.metamask.io/home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = LegacyLinkAdapter.createHandlerContext(coreLink);

      expect(result.instance).toBeUndefined();
      expect(typeof result.handled).toBe('function');
      expect(result.browserCallBack).toBeUndefined();
      expect(result.wcURL).toBe('metamask://home');
      expect(result.origin).toBe('test');
    });
  });
});
