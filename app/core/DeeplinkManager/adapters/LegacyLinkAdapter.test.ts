import { LegacyLinkAdapter } from './LegacyLinkAdapter';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import extractURLParams from '../ParseManager/extractURLParams';

// Mock dependencies
jest.mock('../CoreLinkNormalizer');
jest.mock('../ParseManager/extractURLParams');

describe('LegacyLinkAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('toLegacyFormat', () => {
    it('calls extractURLParams with the original URL', () => {
      const mockLink: CoreUniversalLink = {
        originalUrl: 'metamask://swap?from=ETH&to=USDC',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=USDC',
        protocol: 'metamask',
        action: 'swap',
        hostname: '',
        pathname: '/swap',
        params: { from: 'ETH', to: 'USDC' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const mockExtractResult = {
        urlObj: {} as ReturnType<typeof extractURLParams>['urlObj'],
        params: { from: 'ETH', to: 'USDC' } as unknown as ReturnType<
          typeof extractURLParams
        >['params'],
      };

      (extractURLParams as jest.Mock).mockReturnValue(mockExtractResult);

      const result = LegacyLinkAdapter.toLegacyFormat(mockLink);

      expect(extractURLParams).toHaveBeenCalledWith(
        'metamask://swap?from=ETH&to=USDC',
      );
      expect(result).toEqual(mockExtractResult);
    });

    it('preserves all parameters from original URL', () => {
      const mockLink: CoreUniversalLink = {
        originalUrl:
          'metamask://perps?symbol=ETH&utm_source=app&utm_campaign=test',
        normalizedUrl:
          'https://link.metamask.io/perps?symbol=ETH&utm_source=app&utm_campaign=test',
        protocol: 'metamask',
        action: 'perps',
        hostname: '',
        pathname: '/perps',
        params: { symbol: 'ETH', utm_source: 'app', utm_campaign: 'test' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const mockExtractResult = {
        urlObj: {} as ReturnType<typeof extractURLParams>['urlObj'],
        params: {
          symbol: 'ETH',
          utm_source: 'app',
          utm_campaign: 'test',
        } as unknown as ReturnType<typeof extractURLParams>['params'],
      };

      (extractURLParams as jest.Mock).mockReturnValue(mockExtractResult);

      LegacyLinkAdapter.toLegacyFormat(mockLink);

      expect(extractURLParams).toHaveBeenCalledWith(mockLink.originalUrl);
    });
  });

  describe('fromLegacyFormat', () => {
    it('creates CoreUniversalLink from legacy components', () => {
      const url = 'metamask://home';
      const urlObj = {} as Parameters<
        typeof LegacyLinkAdapter.fromLegacyFormat
      >[1];
      const params = {} as Parameters<
        typeof LegacyLinkAdapter.fromLegacyFormat
      >[2];
      const source = 'test';

      const mockNormalizedLink: CoreUniversalLink = {
        originalUrl: url,
        normalizedUrl: 'https://link.metamask.io/home',
        protocol: 'metamask',
        action: 'home',
        hostname: '',
        pathname: '/home',
        params: {},
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue(
        mockNormalizedLink,
      );

      const result = LegacyLinkAdapter.fromLegacyFormat(
        url,
        urlObj,
        params,
        source,
      );

      expect(CoreLinkNormalizer.normalize).toHaveBeenCalledWith(url, source);
      expect(result).toEqual(mockNormalizedLink);
    });

    it('merges legacy params into normalized params', () => {
      const url = 'metamask://swap?from=ETH&to=USDC';
      const urlObj = {} as Parameters<
        typeof LegacyLinkAdapter.fromLegacyFormat
      >[1];
      const legacyParams = {
        from: 'ETH',
        to: 'USDC',
        amount: '1.5',
      } as unknown as Parameters<typeof LegacyLinkAdapter.fromLegacyFormat>[2];
      const source = 'test';

      const mockNormalizedLink: CoreUniversalLink = {
        originalUrl: url,
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=USDC',
        protocol: 'metamask',
        action: 'swap',
        hostname: '',
        pathname: '/swap',
        params: { from: 'ETH', to: 'USDC' },
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue(
        mockNormalizedLink,
      );

      const result = LegacyLinkAdapter.fromLegacyFormat(
        url,
        urlObj,
        legacyParams,
        source,
      );

      expect(result.params).toMatchObject({
        from: 'ETH',
        to: 'USDC',
        amount: '1.5',
      });
    });

    it('converts boolean hr param to string', () => {
      const url = 'metamask://connect?hr=1';
      const urlObj = {} as Parameters<
        typeof LegacyLinkAdapter.fromLegacyFormat
      >[1];
      const legacyParams = {
        hr: true,
      } as unknown as Parameters<typeof LegacyLinkAdapter.fromLegacyFormat>[2];
      const source = 'test';

      const mockNormalizedLink: CoreUniversalLink = {
        originalUrl: url,
        normalizedUrl: 'https://link.metamask.io/connect?hr=1',
        protocol: 'metamask',
        action: 'connect',
        hostname: '',
        pathname: '/connect',
        params: {},
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: true,
        },
      };

      (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue(
        mockNormalizedLink,
      );

      const result = LegacyLinkAdapter.fromLegacyFormat(
        url,
        urlObj,
        legacyParams,
        source,
      );

      expect(result.params.hr).toBe('1');
    });

    it('filters out null and undefined params', () => {
      const url = 'metamask://home';
      const urlObj = {} as Parameters<
        typeof LegacyLinkAdapter.fromLegacyFormat
      >[1];
      const legacyParams = {
        validParam: 'value',
        nullParam: null,
        undefinedParam: undefined,
        emptyParam: '',
      } as unknown as Parameters<typeof LegacyLinkAdapter.fromLegacyFormat>[2];
      const source = 'test';

      const mockNormalizedLink: CoreUniversalLink = {
        originalUrl: url,
        normalizedUrl: 'https://link.metamask.io/home',
        protocol: 'metamask',
        action: 'home',
        hostname: '',
        pathname: '/home',
        params: {},
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue(
        mockNormalizedLink,
      );

      const result = LegacyLinkAdapter.fromLegacyFormat(
        url,
        urlObj,
        legacyParams,
        source,
      );

      expect(result.params).toMatchObject({
        validParam: 'value',
      });
      expect(result.params.nullParam).toBeUndefined();
      expect(result.params.undefinedParam).toBeUndefined();
      expect(result.params.emptyParam).toBeUndefined();
    });
  });

  describe('shouldUseNewSystem', () => {
    it('returns true for metamask:// URLs', () => {
      (CoreLinkNormalizer.isSupportedDeeplink as jest.Mock).mockReturnValue(
        true,
      );

      const result = LegacyLinkAdapter.shouldUseNewSystem('metamask://home');

      expect(CoreLinkNormalizer.isSupportedDeeplink).toHaveBeenCalledWith(
        'metamask://home',
      );
      expect(result).toBe(true);
    });

    it('returns true for https:// universal links', () => {
      (CoreLinkNormalizer.isSupportedDeeplink as jest.Mock).mockReturnValue(
        true,
      );

      const result = LegacyLinkAdapter.shouldUseNewSystem(
        'https://link.metamask.io/swap',
      );

      expect(CoreLinkNormalizer.isSupportedDeeplink).toHaveBeenCalledWith(
        'https://link.metamask.io/swap',
      );
      expect(result).toBe(true);
    });

    it('returns false for unsupported protocols', () => {
      (CoreLinkNormalizer.isSupportedDeeplink as jest.Mock).mockReturnValue(
        false,
      );

      const result = LegacyLinkAdapter.shouldUseNewSystem('wc://connect');

      expect(result).toBe(false);
    });

    it('returns false for empty URLs', () => {
      const result = LegacyLinkAdapter.shouldUseNewSystem('');

      expect(result).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      const result = LegacyLinkAdapter.shouldUseNewSystem(
        null as unknown as string,
      );

      expect(result).toBe(false);
    });
  });

  describe('wrapHandler', () => {
    it('calls legacy handler with extracted params', async () => {
      const mockLegacyHandler = jest.fn();
      const mockParamExtractor = jest.fn().mockReturnValue({ test: 'value' });
      const mockLink: CoreUniversalLink = {
        originalUrl: 'metamask://test',
        normalizedUrl: 'https://link.metamask.io/test',
        protocol: 'metamask',
        action: 'test',
        hostname: '',
        pathname: '/test',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const wrappedHandler = LegacyLinkAdapter.wrapHandler(
        mockLegacyHandler,
        mockParamExtractor,
      );

      await wrappedHandler(mockLink);

      expect(mockParamExtractor).toHaveBeenCalledWith(mockLink);
      expect(mockLegacyHandler).toHaveBeenCalledWith({ test: 'value' });
    });

    it('handles async legacy handlers', async () => {
      const mockLegacyHandler = jest.fn().mockResolvedValue(Promise.resolve());
      const mockParamExtractor = jest.fn().mockReturnValue({ test: 'value' });
      const mockLink: CoreUniversalLink = {
        originalUrl: 'metamask://test',
        normalizedUrl: 'https://link.metamask.io/test',
        protocol: 'metamask',
        action: 'test',
        hostname: '',
        pathname: '/test',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const wrappedHandler = LegacyLinkAdapter.wrapHandler(
        mockLegacyHandler,
        mockParamExtractor,
      );

      await wrappedHandler(mockLink);

      expect(mockLegacyHandler).toHaveBeenCalled();
    });
  });

  describe('extractActionParams', () => {
    it('extracts swap params with path and query string', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://swap?from=ETH&to=USDC',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=USDC',
        protocol: 'metamask',
        action: 'swap',
        hostname: '',
        pathname: '/swap',
        params: { from: 'ETH', to: 'USDC' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        swapPath: 'swap?from=ETH&to=USDC',
      });
    });

    it('extracts perps params', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://perps?symbol=BTC',
        normalizedUrl: 'https://link.metamask.io/perps?symbol=BTC',
        protocol: 'metamask',
        action: 'perps',
        hostname: '',
        pathname: '/perps',
        params: { symbol: 'BTC' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        perpsPath: 'perps?symbol=BTC',
      });
    });

    it('extracts rewards params', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://rewards?referral=abc123',
        normalizedUrl: 'https://link.metamask.io/rewards?referral=abc123',
        protocol: 'metamask',
        action: 'rewards',
        hostname: '',
        pathname: '/rewards',
        params: { referral: 'abc123' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        rewardsPath: 'rewards?referral=abc123',
      });
    });

    it('extracts home params with path segments', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://home/wallet',
        normalizedUrl: 'https://link.metamask.io/home/wallet',
        protocol: 'metamask',
        action: 'home',
        hostname: '',
        pathname: '/home/wallet',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        homePath: 'home/wallet',
      });
    });

    it('extracts create-account params', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://create-account',
        normalizedUrl: 'https://link.metamask.io/create-account',
        protocol: 'metamask',
        action: 'create-account',
        hostname: '',
        pathname: '/create-account',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        path: 'create-account',
      });
    });

    it('returns default params for unknown actions', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://unknown-action',
        normalizedUrl: 'https://link.metamask.io/unknown-action',
        protocol: 'metamask',
        action: 'unknown-action',
        hostname: '',
        pathname: '/unknown-action',
        params: { custom: 'value' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        url: 'metamask://unknown-action',
        params: { custom: 'value' },
        action: 'unknown-action',
      });
    });

    it('handles paths without query parameters', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://swap',
        normalizedUrl: 'https://link.metamask.io/swap',
        protocol: 'metamask',
        action: 'swap',
        hostname: '',
        pathname: '/swap',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        swapPath: 'swap',
      });
    });

    it('handles complex paths with multiple segments', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://home/wallet/tokens',
        normalizedUrl: 'https://link.metamask.io/home/wallet/tokens',
        protocol: 'metamask',
        action: 'home',
        hostname: '',
        pathname: '/home/wallet/tokens',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        homePath: 'home/wallet/tokens',
      });
    });

    it('handles perps-markets action', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://perps-markets',
        normalizedUrl: 'https://link.metamask.io/perps-markets',
        protocol: 'metamask',
        action: 'perps-markets',
        hostname: '',
        pathname: '/perps-markets',
        params: {},
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        perpsPath: 'perps-markets',
      });
    });

    it('handles perps-asset action', () => {
      const link: CoreUniversalLink = {
        originalUrl: 'metamask://perps-asset?symbol=ETH',
        normalizedUrl: 'https://link.metamask.io/perps-asset?symbol=ETH',
        protocol: 'metamask',
        action: 'perps-asset',
        hostname: '',
        pathname: '/perps-asset',
        params: { symbol: 'ETH' },
        metadata: {
          source: 'test',
          timestamp: Date.now(),
          needsAuth: true,
          isSDKAction: false,
        },
      };

      const result = LegacyLinkAdapter.extractActionParams(link);

      expect(result).toEqual({
        perpsPath: 'perps-asset?symbol=ETH',
      });
    });
  });
});
