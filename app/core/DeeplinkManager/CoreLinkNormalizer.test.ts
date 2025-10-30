import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import { CoreUniversalLink } from './types/CoreUniversalLink';
import AppConstants from '../AppConstants';

describe('CoreLinkNormalizer', () => {
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('normalize', () => {
    it('normalizes basic metamask:// links', () => {
      const url = 'metamask://swap';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('metamask');
      expect(result.action).toBe('swap');
      expect(result.source).toBe(source);
      expect(result.isValid).toBe(true);
      expect(result.isSupportedAction).toBe(true);
      expect(result.timestamp).toBe(mockTimestamp);
    });

    it('normalizes metamask:// links with query parameters', () => {
      const url = 'metamask://swap?from=ETH&to=DAI&amount=100';
      const source = 'qr-code';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('metamask');
      expect(result.action).toBe('swap');
      expect(result.params.from).toBe('ETH');
      expect(result.params.to).toBe('DAI');
      expect(result.params.amount).toBe('100');
      expect(result.params.swapPath).toBe('swap?from=ETH&to=DAI&amount=100');
    });

    it('normalizes https:// universal links', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/send`;
      const source = 'browser';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('https');
      expect(result.action).toBe('send');
      expect(result.host).toBe(AppConstants.MM_IO_UNIVERSAL_LINK_HOST);
      expect(result.isValid).toBe(true);
    });

    it('normalizes universal links with paths and parameters', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/dapp/app.uniswap.org?chain=1`;
      const source = 'deep-link';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('https');
      expect(result.action).toBe('dapp');
      expect(result.params.chain).toBe('1');
      expect(result.params.dappPath).toBe('dapp/app.uniswap.org?chain=1');
    });

    it('converts hr parameter from string to boolean', () => {
      const url = 'metamask://home?hr=1';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.hr).toBe(true);
    });

    it('uses 0 value hr as a boolean', () => {
      const url = 'metamask://home?hr=0';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.hr).toBe(false);

      const generatedLink: CoreUniversalLink = {
        protocol: 'https',
        host: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        action: 'home',
        params: { hr: true },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: '',
        normalizedUrl: '',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const generatedMetamaskLink =
        CoreLinkNormalizer.toMetaMaskProtocol(generatedLink);

      expect(generatedMetamaskLink).toBe('metamask://home?hr=1');
    });

    it('extracts SDK parameters', () => {
      const url = 'metamask://connect?channelId=123&comm=socket&pubkey=abc&v=2';
      const source = 'sdk';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('connect');
      expect(result.params.channelId).toBe('123');
      expect(result.params.comm).toBe('socket');
      expect(result.params.pubkey).toBe('abc');
      expect(result.params.v).toBe('2');
      expect(result.requiresAuth).toBe(false);
    });

    it('extracts attribution parameters', () => {
      const url =
        'metamask://home?utm_source=twitter&utm_medium=social&utm_campaign=launch';
      const source = 'marketing';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.utm_source).toBe('twitter');
      expect(result.params.utm_medium).toBe('social');
      expect(result.params.utm_campaign).toBe('launch');
    });

    it('identifies auth-required actions', () => {
      const url = 'metamask://send?to=0x123';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('send');
      expect(result.requiresAuth).toBe(true);
    });

    it('extracts ramp actions with paths', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/buy-crypto?amount=100&currency=USD`;
      const source = 'ramp';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('buy-crypto');
      expect(result.params.rampPath).toBe('buy-crypto?amount=100&currency=USD');
      expect(result.params.amount).toBe('100');
      expect(result.params.currency).toBe('USD');
    });

    it('extracts perps actions', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/perps-asset/ETH-USD`;
      const source = 'perps';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('perps-asset');
      expect(result.params.perpsPath).toBe('perps-asset/ETH-USD');
    });

    it('defaults to home action when no action specified', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/`;
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('home');
    });

    it('labels invalid URLs as invalid', () => {
      const url = 'not-a-valid-url';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.isValid).toBe(false);
      expect(result.isSupportedAction).toBe(false);
    });

    it('converts message parameter with spaces to +', () => {
      const url = 'metamask://connect?message=Hello World';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.message).toBe('Hello+World');
    });

    it('filters out null and empty parameters', () => {
      const url = 'metamask://swap?from=ETH&to=&amount=null&empty=';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.from).toBe('ETH');
      expect(result.params.to).toBeUndefined();
      expect(result.params.amount).toBeUndefined();
      expect(result.params.empty).toBeUndefined();
    });

    it('parses account parameter format correctly', () => {
      const url = 'metamask://send?account=0x123@1';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.account).toBe('0x123@1');
    });

    it('extracts wc actions correctly', () => {
      const url = 'metamask://wc?uri=wc:123';
      const source = 'wallet-connect';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('wc');
      expect(result.params.uri).toBe('wc:123');
    });

    it('extracts onboarding action correctly', () => {
      const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/onboarding/step1`;
      const source = 'onboarding';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('onboarding');
      expect(result.params.onboardingPath).toBe('onboarding/step1');
    });

    it('extracts create-account action correctly', () => {
      const url = 'metamask://create-account?name=NewAccount';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('create-account');
      expect(result.params.createAccountPath).toBe(
        'create-account?name=NewAccount',
      );
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe('toMetaMaskProtocol', () => {
    it('converts https links to metamask protocol', () => {
      const link: CoreUniversalLink = {
        protocol: 'https',
        host: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        action: 'swap',
        params: { from: 'ETH', to: 'DAI' },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI`,
        normalizedUrl: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = CoreLinkNormalizer.toMetaMaskProtocol(link);

      expect(result).toBe('metamask://swap?from=ETH&to=DAI');
    });

    it('preserves metamask protocol links', () => {
      const originalUrl = 'metamask://home';
      const link: CoreUniversalLink = {
        protocol: 'metamask',
        action: 'home',
        params: {},
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl,
        normalizedUrl: originalUrl,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = CoreLinkNormalizer.toMetaMaskProtocol(link);

      expect(result).toBe(originalUrl);
    });
  });

  describe('isSupportedDeeplink', () => {
    it('returns true for supported deeplinks', () => {
      const url = 'metamask://swap';

      const result = CoreLinkNormalizer.isSupportedDeeplink(url);

      expect(result).toBe(true);
    });

    it('returns false for unsupported actions', () => {
      const url = 'metamask://unknown-action';

      const result = CoreLinkNormalizer.isSupportedDeeplink(url);

      expect(result).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      const url = 'not-a-url';

      const result = CoreLinkNormalizer.isSupportedDeeplink(url);

      expect(result).toBe(false);
    });
  });

  describe('buildDeeplink', () => {
    it('builds metamask protocol links', () => {
      const result = CoreLinkNormalizer.buildDeeplink('metamask', 'swap', {
        from: 'ETH',
        to: 'DAI',
        amount: '100',
      });

      expect(result).toBe('metamask://swap?from=ETH&to=DAI&amount=100');
    });

    it('builds https protocol links', () => {
      const result = CoreLinkNormalizer.buildDeeplink('https', 'send', {
        to: '0x123',
        value: '1',
      });

      expect(result).toBe(
        `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/send?to=0x123&value=1`,
      );
    });

    it('builds links without parameters', () => {
      const result = CoreLinkNormalizer.buildDeeplink('metamask', 'home');

      expect(result).toBe('metamask://home');
    });

    it('converts boolean hr parameter correctly', () => {
      const result = CoreLinkNormalizer.buildDeeplink('metamask', 'home', {
        hr: true,
      });

      expect(result).toBe('metamask://home?hr=1');
    });

    it('filters out empty parameters', () => {
      const result = CoreLinkNormalizer.buildDeeplink('metamask', 'swap', {
        from: 'ETH',
        to: '',
        amount: undefined,
        empty: null as unknown as string,
      });

      expect(result).toBe('metamask://swap?from=ETH');
    });
  });
});
