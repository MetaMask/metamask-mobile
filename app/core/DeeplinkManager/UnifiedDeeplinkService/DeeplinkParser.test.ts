import { DeeplinkParser, ParsedDeeplink } from './DeeplinkParser';
import { ACTIONS, PROTOCOLS } from '../../../constants/deeplinks';

// Mock AppConstants
jest.mock('../../AppConstants', () => ({
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
  MM_IO_UNIVERSAL_LINK_HOST: 'link.metamask.io',
  MM_IO_UNIVERSAL_LINK_TEST_HOST: 'link-test.metamask.io',
}));

describe('DeeplinkParser', () => {
  let parser: DeeplinkParser;

  beforeEach(() => {
    parser = DeeplinkParser.getInstance();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = DeeplinkParser.getInstance();
      const instance2 = DeeplinkParser.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('parse traditional deeplinks', () => {
    it('parses metamask://buy correctly', () => {
      const url = 'metamask://buy?amount=100&chainId=1';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.BUY,
        path: '',
        params: expect.objectContaining({
          amount: '100',
          chainId: '1',
        }),
        originalUrl: url,
        scheme: 'metamask:',
        isUniversalLink: false,
        isSupportedDomain: true,
      });
    });

    it('parses metamask://sell-crypto correctly', () => {
      const url = 'metamask://sell-crypto?amount=50';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.SELL_CRYPTO,
        path: '',
        params: expect.objectContaining({
          amount: '50',
        }),
        scheme: 'metamask:',
        isUniversalLink: false,
      });
    });

    it('parses metamask://connect with parameters', () => {
      const url =
        'metamask://connect?channelId=123&pubkey=abc&comm=deeplinking';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.CONNECT,
        path: '',
        params: expect.objectContaining({
          channelId: '123',
          pubkey: 'abc',
          comm: 'deeplinking',
        }),
        scheme: 'metamask:',
      });
    });

    it('parses wc:// protocol correctly', () => {
      const url = 'wc:abc123@1?bridge=https://bridge.walletconnect.org';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.WC,
        scheme: 'wc:',
        isUniversalLink: false,
      });
    });

    it('parses ethereum:// protocol correctly', () => {
      const url =
        'ethereum:0x1234567890abcdef@1/transfer?address=0xabcd&uint256=100';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: PROTOCOLS.ETHEREUM,
        scheme: 'ethereum:',
        isUniversalLink: false,
      });
    });
  });

  describe('parse universal links', () => {
    it('parses https://link.metamask.io/buy correctly', () => {
      const url = 'https://link.metamask.io/buy?amount=100&chainId=1';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.BUY,
        path: '',
        params: expect.objectContaining({
          amount: '100',
          chainId: '1',
        }),
        originalUrl: url,
        scheme: 'https:',
        hostname: 'link.metamask.io',
        isUniversalLink: true,
        isSupportedDomain: true,
      });
    });

    it('parses universal link with path correctly', () => {
      const url = 'https://link.metamask.io/perps/markets/BTC';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.PERPS,
        path: 'markets/BTC',
        scheme: 'https:',
        isUniversalLink: true,
        isSupportedDomain: true,
      });
    });

    it('parses metamask.app.link domain correctly', () => {
      const url = 'https://metamask.app.link/swap';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.SWAP,
        hostname: 'metamask.app.link',
        isUniversalLink: true,
        isSupportedDomain: true,
      });
    });

    it('identifies unsupported domains', () => {
      const url = 'https://example.com/buy';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.BUY,
        hostname: 'example.com',
        isUniversalLink: true,
        isSupportedDomain: false,
      });
    });

    it('parses universal link with signature', () => {
      const url = 'https://link.metamask.io/buy?amount=100&sig=abc123';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.BUY,
        signature: 'abc123',
        params: expect.objectContaining({
          amount: '100',
          sig: 'abc123',
        }),
      });
    });
  });

  describe('parameter extraction', () => {
    it('extracts all standard parameters', () => {
      const url =
        'metamask://connect?channelId=123&pubkey=abc&v=2&hr=1&message=hello+world';
      const result = parser.parse(url);

      expect(result.params).toMatchObject({
        channelId: '123',
        pubkey: 'abc',
        v: '2',
        hr: true, // Converted from '1'
        message: 'hello+world',
      });
    });

    it('handles empty parameters', () => {
      const url = 'metamask://buy';
      const result = parser.parse(url);

      expect(result.params.amount).toBeUndefined();
      expect(result.params.hr).toBe(false);
    });

    it('handles utm parameters', () => {
      const url =
        'https://link.metamask.io/buy?utm_source=twitter&utm_campaign=promo';
      const result = parser.parse(url);

      expect(result.params).toMatchObject({
        utm_source: 'twitter',
        utm_campaign: 'promo',
      });
    });
  });

  describe('validate', () => {
    it('validates correct traditional deeplink', () => {
      const parsed = parser.parse('metamask://buy?amount=100');
      const validation = parser.validate(parsed);

      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });

    it('validates correct universal link', () => {
      const parsed = parser.parse('https://link.metamask.io/buy');
      const validation = parser.validate(parsed);

      expect(validation.isValid).toBe(true);
    });

    it('invalidates metamask:// URL without action', () => {
      // Manually create a parsed object without action
      const parsed: ParsedDeeplink = {
        action: '',
        path: '',
        params: {},
        originalUrl: 'metamask://',
        scheme: 'metamask:',
        isUniversalLink: false,
        isSupportedDomain: true,
      };

      const validation = parser.validate(parsed);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('No action specified for metamask:// URL');
    });

    it('invalidates universal link with unsupported domain', () => {
      const parsed = parser.parse('https://evil.com/buy');
      const validation = parser.validate(parsed);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Unsupported domain for universal link');
    });

    it('invalidates malformed hostname', () => {
      const parsed: ParsedDeeplink = {
        action: 'buy',
        path: '',
        params: {},
        originalUrl: 'https://example.com?test/buy',
        scheme: 'https:',
        hostname: 'example.com?test',
        isUniversalLink: true,
        isSupportedDomain: false,
      };

      const validation = parser.validate(parsed);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Invalid hostname');
    });
  });

  describe('edge cases', () => {
    it('handles dapp protocol special case', () => {
      const url = 'dapp://example.com';
      const result = parser.parse(url);

      expect(result).toMatchObject({
        action: ACTIONS.DAPP,
        scheme: 'dapp:',
      });
    });

    it('handles malformed URLs gracefully', () => {
      expect(() => parser.parse('not-a-url')).toThrow(
        'Failed to parse deeplink',
      );
      expect(() => parser.parse('')).toThrow('Failed to parse deeplink');
    });

    it('handles URLs with multiple slashes', () => {
      const url = 'metamask://buy//extra/path';
      const result = parser.parse(url);

      expect(result.action).toBe(ACTIONS.BUY);
    });

    it('preserves query parameters in path for traditional deeplinks', () => {
      const url = 'metamask://buy/some/path?amount=100';
      const result = parser.parse(url);

      expect(result.path).toBe('/some/path');
      expect(result.params.amount).toBe('100');
    });
  });

  describe('action extraction', () => {
    it('extracts all known actions from metamask:// URLs', () => {
      const testCases = [
        { url: 'metamask://buy', expected: ACTIONS.BUY },
        { url: 'metamask://buy-crypto', expected: ACTIONS.BUY_CRYPTO },
        { url: 'metamask://sell', expected: ACTIONS.SELL },
        { url: 'metamask://sell-crypto', expected: ACTIONS.SELL_CRYPTO },
        { url: 'metamask://swap', expected: ACTIONS.SWAP },
        { url: 'metamask://send', expected: ACTIONS.SEND },
        { url: 'metamask://connect', expected: ACTIONS.CONNECT },
        { url: 'metamask://wc', expected: ACTIONS.WC },
        { url: 'metamask://dapp', expected: ACTIONS.DAPP },
        { url: 'metamask://rewards', expected: ACTIONS.REWARDS },
        { url: 'metamask://perps', expected: ACTIONS.PERPS },
      ];

      testCases.forEach(({ url, expected }) => {
        const result = parser.parse(url);
        expect(result.action).toBe(expected);
      });
    });

    it('returns empty action for unknown metamask:// actions', () => {
      const url = 'metamask://unknown-action';
      const result = parser.parse(url);
      expect(result.action).toBe('');
    });
  });
});
