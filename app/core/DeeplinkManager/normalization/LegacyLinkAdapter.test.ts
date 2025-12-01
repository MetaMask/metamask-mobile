/**
 * Tests for LegacyLinkAdapter
 */

import { LegacyLinkAdapter } from './LegacyLinkAdapter';
import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import { CoreUniversalLink, CoreLinkParams } from '../types/CoreUniversalLink';
import { ACTIONS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';

describe('LegacyLinkAdapter', () => {
  describe('toLegacyFormat', () => {
    it('converts basic CoreUniversalLink to legacy format', () => {
      const coreLink = CoreLinkNormalizer.normalize(
        'metamask://swap?from=ETH&to=DAI',
        'test',
      );

      const { urlObj, params } = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect(urlObj.hostname).toBe('swap');
      expect(urlObj.protocol).toBe('metamask:');
      expect(params).toBeDefined();
    });

    it('preserves SDK parameters in conversion', () => {
      const coreLink = CoreLinkNormalizer.normalize(
        'metamask://connect?channelId=123&pubkey=abc&comm=test',
        'sdk',
      );

      const { params } = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect(params.channelId).toBe('123');
      expect(params.pubkey).toBe('abc');
      expect(params.comm).toBe('test');
    });

    it('preserves custom parameters not defined in DeeplinkUrlParams interface', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          from: 'ETH',
          to: 'DAI',
          customParam: 'customValue',
        } as CoreLinkParams & { from: string; to: string; customParam: string },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://swap?from=ETH&to=DAI&customParam=customValue',
        normalizedUrl:
          'https://link.metamask.io/swap?from=ETH&to=DAI&customParam=customValue',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { params } = LegacyLinkAdapter.toLegacyFormat(coreLink);

      expect((params as unknown as Record<string, unknown>).from).toBe('ETH');
      expect((params as unknown as Record<string, unknown>).to).toBe('DAI');
      expect((params as unknown as Record<string, unknown>).customParam).toBe(
        'customValue',
      );
    });

    it('sets default values for required params when undefined', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.HOME,
        params: {
          uri: undefined,
          redirect: undefined,
          channelId: '123',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://home?channelId=123',
        normalizedUrl: 'https://link.metamask.io/home?channelId=123',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { params } = LegacyLinkAdapter.toLegacyFormat(coreLink);

      // Required fields get default values
      expect(params.uri).toBe('');
      expect(params.redirect).toBe('');
      expect(params.channelId).toBe('123');
    });
  });

  describe('fromLegacyFormat', () => {
    it('converts legacy format to CoreUniversalLink', () => {
      const url = 'metamask://swap?from=ETH&to=DAI';
      const source = 'legacy';

      const coreLink = LegacyLinkAdapter.fromLegacyFormat(url, source);

      expect(coreLink.action).toBe(ACTIONS.SWAP);
      expect(coreLink.protocol).toBe('metamask');
      expect(coreLink.source).toBe(source);
    });

    it('merges additional parameters', () => {
      const url = 'metamask://connect';
      const source = 'legacy';
      const additionalParams = {
        channelId: '123',
        pubkey: 'abc',
        sdkVersion: '1.0.0',
      };

      const coreLink = LegacyLinkAdapter.fromLegacyFormat(
        url,
        source,
        additionalParams,
      );

      expect(coreLink.params.channelId).toBe('123');
      expect(coreLink.params.pubkey).toBe('abc');
      expect(coreLink.params.sdkVersion).toBe('1.0.0');
    });

    it('preserves empty values in additional params', () => {
      const url = 'metamask://home';
      const source = 'legacy';
      const additionalParams = {
        uri: '',
        redirect: undefined,
        channelId: '123',
      };

      const coreLink = LegacyLinkAdapter.fromLegacyFormat(
        url,
        source,
        additionalParams,
      );

      expect(coreLink.params.uri).toBe('');
      expect(coreLink.params.redirect).toBeUndefined(); // null not passed through
      expect(coreLink.params.channelId).toBe('123');
    });
  });

  describe('shouldUseNewSystem', () => {
    it('returns true for actions enabled in new system', () => {
      // only add values when you actually enable these actions
    });

    it('returns false for actions not yet migrated', () => {
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.HOME)).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.SWAP)).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.SEND)).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.RAMP)).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.PERPS)).toBe(false);
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.CREATE_ACCOUNT)).toBe(
        false,
      );
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.PERPS_MARKETS)).toBe(
        false,
      );
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.PERPS_ASSET)).toBe(
        false,
      );
      expect(LegacyLinkAdapter.shouldUseNewSystem(ACTIONS.REWARDS)).toBe(false);
    });
  });

  describe('wrapHandler', () => {
    it('wraps legacy handler to accept CoreUniversalLink', () => {
      const legacyHandler = jest.fn();
      const wrappedHandler = LegacyLinkAdapter.wrapHandler(legacyHandler);

      const coreLink = CoreLinkNormalizer.normalize(
        'metamask://swap?from=ETH',
        'test',
      );
      const additionalContext = {
        instance: { test: true },
        handled: jest.fn(),
      };

      wrappedHandler(coreLink, additionalContext);

      expect(legacyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          urlObj: expect.any(Object),
          params: expect.any(Object),
          instance: additionalContext.instance,
          handled: additionalContext.handled,
        }),
      );
    });
  });

  describe('extractActionParams', () => {
    it('extracts swap action parameters', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          swapPath: 'swap/ETH/DAI?amount=100',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://swap/ETH/DAI?amount=100',
        normalizedUrl: 'https://link.metamask.io/swap/ETH/DAI?amount=100',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { actionPath, actionParams } =
        LegacyLinkAdapter.extractActionParams(coreLink);

      expect(actionPath).toBe('ETH/DAI');
      expect(actionParams.amount).toBe('100');
    });

    it('extracts ramp action parameters', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.RAMP,
        params: {
          rampPath: 'buy?currency=ETH&amount=500',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://ramp/buy?currency=ETH&amount=500',
        normalizedUrl:
          'https://link.metamask.io/ramp/buy?currency=ETH&amount=500',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { actionPath, actionParams } =
        LegacyLinkAdapter.extractActionParams(coreLink);

      expect(actionPath).toBe('buy');
      expect(actionParams.currency).toBe('ETH');
      expect(actionParams.amount).toBe('500');
    });

    it('handles paths with subdirectories', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.PERPS,
        params: {
          perpsPath: 'markets/BTC/USD',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://perps/markets/BTC/USD',
        normalizedUrl: 'https://link.metamask.io/perps/markets/BTC/USD',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { actionPath, actionParams } =
        LegacyLinkAdapter.extractActionParams(coreLink);

      expect(actionPath).toBe('markets/BTC/USD');
      expect(Object.keys(actionParams).length).toBe(0);
    });

    it('handles empty action path', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.HOME,
        params: {},
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://home',
        normalizedUrl: 'https://link.metamask.io/home',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const { actionPath, actionParams } =
        LegacyLinkAdapter.extractActionParams(coreLink);

      expect(actionPath).toBe('');
      expect(Object.keys(actionParams).length).toBe(0);
    });
  });

  describe('toProtocolUrl', () => {
    it('converts to metamask:// protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'https',
        action: ACTIONS.SWAP,
        params: {
          from: 'ETH',
          to: 'DAI',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'https://link.metamask.io/swap?from=ETH&to=DAI',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=DAI',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const url = LegacyLinkAdapter.toProtocolUrl(coreLink, 'metamask');

      expect(url).toBe('metamask://swap?from=ETH&to=DAI');
    });

    it('converts send action to ethereum:// protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SEND,
        params: {
          to: '0x1234567890abcdef',
          value: '1000000000000000000',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl:
          'metamask://send?to=0x1234567890abcdef&value=1000000000000000000',
        normalizedUrl:
          'https://link.metamask.io/send?to=0x1234567890abcdef&value=1000000000000000000',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const url = LegacyLinkAdapter.toProtocolUrl(coreLink, 'ethereum');

      expect(url).toBe('ethereum:0x1234567890abcdef?value=1000000000000000000');
    });

    it('throws error when converting *unsupported* action to ethereum protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP, // Unsupported for ethereum
        params: { from: 'ETH', to: 'DAI' },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://swap?from=ETH&to=DAI',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=DAI',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      expect(() =>
        LegacyLinkAdapter.toProtocolUrl(coreLink, 'ethereum'),
      ).toThrow('Unsupported action for ethereum protocol: swap');
    });

    it('converts to dapp:// protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.DAPP,
        params: {
          dappPath: 'app.uniswap.org',
        },
        source: 'test',
        timestamp: Date.now(),
        // INVALID URL, for the record
        // need to enforce standard URL format in the future
        originalUrl: 'metamask://dapp/app.uniswap.org',
        normalizedUrl: 'https://link.metamask.io/dapp/app.uniswap.org',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const url = LegacyLinkAdapter.toProtocolUrl(coreLink, 'dapp');

      expect(url).toBe('dapp://app.uniswap.org');
    });

    it('converts to https:// protocol', () => {
      const coreLink: CoreUniversalLink = {
        protocol: 'metamask',
        action: ACTIONS.SWAP,
        params: {
          from: 'ETH',
          to: 'DAI',
        },
        source: 'test',
        timestamp: Date.now(),
        originalUrl: 'metamask://swap?from=ETH&to=DAI',
        normalizedUrl: 'https://link.metamask.io/swap?from=ETH&to=DAI',
        isValid: true,
        isSupportedAction: true,
        isPrivateLink: false,
        requiresAuth: false,
      };

      const url = LegacyLinkAdapter.toProtocolUrl(coreLink, 'https');

      expect(url).toBe(
        `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/swap?from=ETH&to=DAI`,
      );
    });
  });
});
