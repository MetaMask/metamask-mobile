import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import AppConstants from '../../AppConstants';

const { MM_IO_UNIVERSAL_LINK_HOST } = AppConstants;

describe('CoreLinkNormalizer', () => {
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('normalization', () => {
    it('normalizes basic metamask:// links', () => {
      const url = 'metamask://swap';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('metamask');
      expect(result.action).toBe('swap');
      expect(result.isValid).toBe(true);
      expect(result.isSupportedAction).toBe(true);
    });

    it('normalizes https:// universal links', () => {
      const url = `https://${MM_IO_UNIVERSAL_LINK_HOST}/send`;
      const source = 'browser';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('https');
      expect(result.action).toBe('send');
      expect(result.host).toBe(MM_IO_UNIVERSAL_LINK_HOST);
      expect(result.isValid).toBe(true);
    });

    it('normalizes universal links with paths and parameters', () => {
      const url = `https://${MM_IO_UNIVERSAL_LINK_HOST}/dapp/app.uniswap.org?chain=1`;
      const source = 'deep-link';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.protocol).toBe('https');
      expect(result.action).toBe('dapp');
      expect(result.params.chain).toBe('1');
      expect(result.params.dappPath).toBe('dapp/app.uniswap.org?chain=1');
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

    it('identifies auth-required actions', () => {
      const url = 'metamask://send?to=0x123';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('send');
      expect(result.requiresAuth).toBe(true);
    });

    it('extracts ramp actions with paths', () => {
      const url = `https://${MM_IO_UNIVERSAL_LINK_HOST}/buy-crypto?amount=100&currency=USD`;
      const source = 'ramp';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('buy-crypto');
      expect(result.params.rampPath).toBe('buy-crypto?amount=100&currency=USD');
      expect(result.params.amount).toBe('100');
      expect(result.params.currency).toBe('USD');
    });

    it('extracts perps actions', () => {
      const url = `https://${MM_IO_UNIVERSAL_LINK_HOST}/perps-asset/ETH-USD`;
      const source = 'perps';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.action).toBe('perps-asset');
      expect(result.params.perpsPath).toBe('perps-asset/ETH-USD');
    });

    it('defaults to home action', () => {
      const url = `https://${MM_IO_UNIVERSAL_LINK_HOST}/`;
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

    it('filters out null and empty parameters', () => {
      const url = 'metamask://swap?from=ETH&to=&amount=null&empty=';
      const source = 'test';

      const result = CoreLinkNormalizer.normalize(url, source);

      expect(result.params.from).toBe('ETH');
      expect(result.params.to).toBeUndefined();
      expect(result.params.amount).toBeUndefined();
      expect(result.params.empty).toBeUndefined();
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
        host: MM_IO_UNIVERSAL_LINK_HOST,
        action: 'swap',
        params: { from: 'ETH', to: 'DAI' },
        source: 'test',
        timestamp: mockTimestamp,
        originalUrl: `https://${MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI`,
        normalizedUrl: `https://${MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI`,
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const result = CoreLinkNormalizer.toMetaMaskProtocol(link);

      expect(result).toBe('metamask://swap?from=ETH&to=DAI');
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
});
