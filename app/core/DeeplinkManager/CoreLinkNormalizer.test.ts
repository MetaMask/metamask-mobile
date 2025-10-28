import { CoreLinkNormalizer } from './CoreLinkNormalizer';

// Mock AppConstants
jest.mock('../AppConstants', () => ({
  MM_IO_UNIVERSAL_LINK_HOST: 'link.metamask.io',
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
  MM_IO_UNIVERSAL_LINK_TEST_HOST: 'link-test.metamask.io',
}));

describe('CoreLinkNormalizer', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
  });

  describe('normalize', () => {
    describe('metamask:// protocol', () => {
      it('normalizes basic metamask:// links', () => {
        const result = CoreLinkNormalizer.normalize('metamask://home', 'test');

        expect(result.originalUrl).toBe('metamask://home');
        expect(result.normalizedUrl).toBe('https://link.metamask.io/home');
        expect(result.protocol).toBe('metamask');
        expect(result.action).toBe('home');
        expect(result.params).toEqual({});
      });

      it('normalizes metamask:// links with parameters', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://swap?from=ETH&to=USDC&amount=100',
          'direct',
        );

        expect(result.protocol).toBe('metamask');
        expect(result.action).toBe('swap');
        expect(result.params.from).toBe('ETH');
        expect(result.params.to).toBe('USDC');
        expect(result.params.amount).toBe('100');
      });

      it('handles SDK connect links', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://connect?channelId=123&pubkey=abc&v=2',
          'direct',
        );

        expect(result.action).toBe('connect');
        expect(result.params.channelId).toBe('123');
        expect(result.params.pubkey).toBe('abc');
        expect(result.params.v).toBe('2');
        expect(result.metadata.isSDKAction).toBe(true);
      });

      it('handles perps links with complex parameters', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://perps?screen=asset&symbol=BTC',
          'branch',
        );

        expect(result.action).toBe('perps');
        expect(result.params.screen).toBe('asset');
        expect(result.params.symbol).toBe('BTC');
        expect(result.metadata.needsAuth).toBe(true);
      });
    });

    describe('https:// protocol', () => {
      it('handles universal links directly', () => {
        const result = CoreLinkNormalizer.normalize(
          'https://link.metamask.io/rewards',
          'branch',
        );

        expect(result.originalUrl).toBe('https://link.metamask.io/rewards');
        expect(result.normalizedUrl).toBe('https://link.metamask.io/rewards');
        expect(result.protocol).toBe('https');
        expect(result.action).toBe('rewards');
      });

      it('handles universal links with query parameters', () => {
        const result = CoreLinkNormalizer.normalize(
          'https://link.metamask.io/rewards?referral=TESTCODE',
          'direct',
        );

        expect(result.action).toBe('rewards');
        expect(result.params.referral).toBe('TESTCODE');
      });

      it('handles test environment hosts', () => {
        const result = CoreLinkNormalizer.normalize(
          'https://link-test.metamask.io/swap',
          'test',
        );

        expect(result.hostname).toBe('link-test.metamask.io');
        expect(result.action).toBe('swap');
      });
    });

    describe('parameter handling', () => {
      it('handles special hr parameter', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://connect?hr=1',
          'direct',
        );

        expect(result.params.hr).toBe('1');
      });

      it('handles message parameter with spaces', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://mmsdk?message=hello world',
          'direct',
        );

        expect(result.params.message).toBe('hello+world');
      });

      it('handles array parameters by taking first value', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://swap?tokens[]=ETH&tokens[]=USDC',
          'direct',
        );

        // Should take first value when arrays are parsed
        expect(result.params.tokens).toBe('ETH');
      });

      it('handles empty parameters', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://home?',
          'direct',
        );

        expect(result.params).toEqual({});
      });

      it('handles malformed parameters gracefully', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://home?invalid=',
          'direct',
        );

        expect(result.params.invalid).toBe('');
      });
    });

    describe('metadata', () => {
      it('identifies actions that need authentication', () => {
        const swapLink = CoreLinkNormalizer.normalize(
          'metamask://swap',
          'direct',
        );
        expect(swapLink.metadata.needsAuth).toBe(true);

        const homeLink = CoreLinkNormalizer.normalize(
          'metamask://home',
          'direct',
        );
        expect(homeLink.metadata.needsAuth).toBe(false);
      });

      it('identifies SDK actions', () => {
        const connectLink = CoreLinkNormalizer.normalize(
          'metamask://connect',
          'direct',
        );
        expect(connectLink.metadata.isSDKAction).toBe(true);

        const swapLink = CoreLinkNormalizer.normalize(
          'metamask://swap',
          'direct',
        );
        expect(swapLink.metadata.isSDKAction).toBe(false);
      });

      it('includes timestamp', () => {
        const before = Date.now();
        const result = CoreLinkNormalizer.normalize(
          'metamask://home',
          'direct',
        );
        const after = Date.now();

        expect(result.metadata.timestamp).toBeGreaterThanOrEqual(before);
        expect(result.metadata.timestamp).toBeLessThanOrEqual(after);
      });

      it('preserves source', () => {
        const result = CoreLinkNormalizer.normalize(
          'metamask://home',
          'branch',
        );
        expect(result.metadata.source).toBe('branch');
      });
    });

    describe('error handling', () => {
      it('handles invalid URLs gracefully', () => {
        const result = CoreLinkNormalizer.normalize('not-a-url', 'direct');

        expect(result.originalUrl).toBe('not-a-url');
        expect(result.normalizedUrl).toBe('https://link.metamask.io/not-a-url');
        expect(result.action).toBe('not-a-url');
        expect(result.params).toEqual({});
      });

      it('handles empty URLs', () => {
        const result = CoreLinkNormalizer.normalize('', 'direct');

        expect(result.originalUrl).toBe('');
        expect(result.normalizedUrl).toBe('https://link.metamask.io/');
        expect(result.action).toBe('home');
      });
    });
  });

  describe('toMetaMaskProtocol', () => {
    it('converts universal links to metamask protocol', () => {
      const result = CoreLinkNormalizer.toMetaMaskProtocol(
        'https://link.metamask.io/swap?from=ETH',
      );

      expect(result).toBe('metamask://swap?from=ETH');
    });

    it('handles test environment hosts', () => {
      const result = CoreLinkNormalizer.toMetaMaskProtocol(
        'https://link-test.metamask.io/home',
      );

      expect(result).toBe('metamask://home');
    });

    it('leaves non-universal links unchanged', () => {
      const result = CoreLinkNormalizer.toMetaMaskProtocol(
        'https://example.com/test',
      );

      expect(result).toBe('https://example.com/test');
    });

    it('handles branch.io hosts', () => {
      const result = CoreLinkNormalizer.toMetaMaskProtocol(
        'https://metamask.app.link/swap',
      );

      expect(result).toBe('metamask://swap');
    });
  });

  describe('isSupportedDeeplink', () => {
    it('identifies metamask:// links', () => {
      expect(CoreLinkNormalizer.isSupportedDeeplink('metamask://home')).toBe(
        true,
      );
      expect(
        CoreLinkNormalizer.isSupportedDeeplink('metamask://swap?from=ETH'),
      ).toBe(true);
    });

    it('identifies universal links', () => {
      expect(
        CoreLinkNormalizer.isSupportedDeeplink('https://link.metamask.io/home'),
      ).toBe(true);
      expect(
        CoreLinkNormalizer.isSupportedDeeplink(
          'https://link-test.metamask.io/swap',
        ),
      ).toBe(true);
    });

    it('rejects unsupported protocols', () => {
      expect(CoreLinkNormalizer.isSupportedDeeplink('ethereum://send')).toBe(
        false,
      );
      expect(CoreLinkNormalizer.isSupportedDeeplink('wc://connect')).toBe(
        false,
      );
      expect(
        CoreLinkNormalizer.isSupportedDeeplink('https://example.com'),
      ).toBe(false);
    });

    it('handles invalid inputs', () => {
      expect(CoreLinkNormalizer.isSupportedDeeplink('')).toBe(false);
      expect(
        CoreLinkNormalizer.isSupportedDeeplink(null as unknown as string),
      ).toBe(false);
      expect(
        CoreLinkNormalizer.isSupportedDeeplink(undefined as unknown as string),
      ).toBe(false);
    });
  });

  describe('buildDeeplink', () => {
    it('builds https deeplinks by default', () => {
      const result = CoreLinkNormalizer.buildDeeplink('swap', {
        from: 'ETH',
        to: 'USDC',
      });

      expect(result).toBe('https://link.metamask.io/swap?from=ETH&to=USDC');
    });

    it('builds metamask:// deeplinks when requested', () => {
      const result = CoreLinkNormalizer.buildDeeplink(
        'perps',
        { screen: 'markets' },
        true,
      );

      expect(result).toBe('metamask://perps?screen=markets');
    });

    it('handles empty params', () => {
      const result = CoreLinkNormalizer.buildDeeplink('home');
      expect(result).toBe('https://link.metamask.io/home');
    });

    it('uses default host', () => {
      const result = CoreLinkNormalizer.buildDeeplink('rewards');
      expect(result).toBe('https://link.metamask.io/rewards');
    });
  });
});
