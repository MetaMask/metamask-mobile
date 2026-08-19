import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import {
  cancelDeeplinkNavigatedTrace,
  cancelDeeplinkProcessedTrace,
  deeplinkUrlTags,
  endDeeplinkProcessedTrace,
  getDeeplinkProcessedTraceContext,
  handleDeeplinkNavigationStateChange,
  markDeeplinkInterstitialContinued,
  markDeeplinkInterstitialShown,
  resetDeeplinkPerformanceForTesting,
  resolveDeeplinkNavigatedTarget,
  startDeeplinkNavigatedTrace,
  startDeeplinkProcessedTrace,
} from './DeeplinkPerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DeeplinkProcessed: 'Deeplink Processed',
    DeeplinkNavigated: 'Deeplink Navigated',
  },
  TraceOperation: {
    DeeplinkPerformance: 'deeplink.performance',
  },
  TRACES_CLEANUP_INTERVAL: 5 * 60 * 1000,
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

const TRENDING_URL = 'https://link.metamask.io/trending?tab=crypto';

describe('DeeplinkPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDeeplinkPerformanceForTesting();
  });

  describe('deeplinkUrlTags', () => {
    it.each([
      ['?tab=', 'https://link.metamask.io/trending?tab=crypto', 'crypto'],
      [
        '?screen=',
        'https://link.metamask.io/trending?screen=favorite-sites',
        'favorite-sites',
      ],
      ['bare', 'https://link.metamask.io/trending', 'default'],
      [
        'schema-rejected value',
        'https://link.metamask.io/trending?tab=<script>',
        'default',
      ],
    ])('maps a %s link to variant %s', (_label, url, variant) => {
      expect(deeplinkUrlTags(url).deeplink_variant).toBe(variant);
    });

    it('reads the route from the host of a custom-scheme link', () => {
      expect(deeplinkUrlTags('metamask://swap').deeplink_route).toBe('swap');
    });

    it('reports signed links', () => {
      expect(
        deeplinkUrlTags('https://link.metamask.io/swap?sig=abc').signed,
      ).toBe(true);
      expect(deeplinkUrlTags(TRENDING_URL).signed).toBe(false);
    });

    it('reports unknown for an unparseable url so error paths stay measured', () => {
      expect(deeplinkUrlTags('not a url').deeplink_route).toBe('unknown');
    });
  });

  describe('Deeplink Processed', () => {
    it('starts with url-derived tags and forces a transaction', () => {
      const token = startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });

      expect(token).not.toBeNull();
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkProcessed,
        op: TraceOperation.DeeplinkPerformance,
        forceTransaction: true,
        tags: {
          deeplink_route: 'trending',
          deeplink_variant: 'crypto',
          signed: false,
          start_source: 'warm',
          app_start_type: 'warm',
        },
      });
    });

    it('guards against a second start while one is in flight', () => {
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });

      const second = startDeeplinkProcessedTrace({
        url: 'metamask://swap',
        source: 'warm',
        appStartType: 'warm',
      });

      expect(second).toBeNull();
      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('ends at the handler_finished seam as a full skipped-interstitial segment', () => {
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });

      endDeeplinkProcessedTrace({ seam: 'handler_finished' });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkProcessed,
        data: {
          success: true,
          seam: 'handler_finished',
          segment: 'full',
          interstitial: 'skipped',
        },
      });
    });

    it('ends at the pre_navigate seam carrying the resolved target route', () => {
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });

      endDeeplinkProcessedTrace({
        seam: 'pre_navigate',
        targetRoute: 'TRENDING_FEED',
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            seam: 'pre_navigate',
            target_route: 'TRENDING_FEED',
          }),
        }),
      );
    });

    it('makes the second end a no-op after the pre_navigate seam fired', () => {
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });

      endDeeplinkProcessedTrace({ seam: 'pre_navigate' });
      endDeeplinkProcessedTrace({ seam: 'handler_finished' });

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it.each(['rejected', 'unresolved', 'error'] as const)(
      'cancels with reason %s',
      (reason) => {
        startDeeplinkProcessedTrace({
          url: TRENDING_URL,
          source: 'warm',
          appStartType: 'warm',
        });

        cancelDeeplinkProcessedTrace({ reason });

        expect(mockEndTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.DeeplinkProcessed,
            data: expect.objectContaining({ success: false, reason }),
          }),
        );
      },
    );

    it('releases the guard on cancel so a retry can start', () => {
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });
      cancelDeeplinkProcessedTrace({ reason: 'rejected' });

      const retry = startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'warm',
        appStartType: 'warm',
      });

      expect(retry).not.toBeNull();
    });
  });

  describe('interstitial split', () => {
    beforeEach(() => {
      startDeeplinkProcessedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });
    });

    it('ends the before_gate segment when the modal is shown', () => {
      markDeeplinkInterstitialShown();

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkProcessed,
        data: {
          success: true,
          segment: 'before_gate',
          interstitial: 'shown',
        },
      });
    });

    it('exposes no parent context while the user decides', () => {
      markDeeplinkInterstitialShown();

      expect(getDeeplinkProcessedTraceContext()).toBeUndefined();
    });

    it('starts the after_gate segment on continue', () => {
      markDeeplinkInterstitialShown();
      mockTrace.mockClear();

      markDeeplinkInterstitialContinued();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.DeeplinkProcessed,
          forceTransaction: true,
          tags: expect.objectContaining({
            segment: 'after_gate',
            interstitial: 'shown',
          }),
        }),
      );
    });

    it('tags the final end as the after_gate segment', () => {
      markDeeplinkInterstitialShown();
      markDeeplinkInterstitialContinued();
      mockEndTrace.mockClear();

      endDeeplinkProcessedTrace({ seam: 'handler_finished' });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            segment: 'after_gate',
            interstitial: 'shown',
          }),
        }),
      );
    });

    it('ignores an end while the modal is up — no span is open', () => {
      markDeeplinkInterstitialShown();
      mockEndTrace.mockClear();

      endDeeplinkProcessedTrace({ seam: 'handler_finished' });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('ignores continue when the modal was never shown (auto-accepted)', () => {
      mockTrace.mockClear();

      markDeeplinkInterstitialContinued();

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('releases state silently on rejection — before_gate already closed as a valid measurement', () => {
      markDeeplinkInterstitialShown();
      mockEndTrace.mockClear();

      cancelDeeplinkProcessedTrace({ reason: 'rejected' });

      expect(mockEndTrace).not.toHaveBeenCalled();
      expect(
        startDeeplinkProcessedTrace({
          url: TRENDING_URL,
          source: 'warm',
          appStartType: 'warm',
        }),
      ).not.toBeNull();
    });

    it('cancels Navigated as interstitial_rejected on rejection', () => {
      startDeeplinkNavigatedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });
      markDeeplinkInterstitialShown();
      mockEndTrace.mockClear();

      cancelDeeplinkProcessedTrace({ reason: 'rejected' });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkNavigated,
        data: { success: false, reason: 'interstitial_rejected' },
      });
    });
  });

  describe('Deeplink Navigated', () => {
    it('starts with url-derived tags and forces a transaction', () => {
      const token = startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });

      expect(token).not.toBeNull();
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkNavigated,
        op: TraceOperation.DeeplinkPerformance,
        forceTransaction: true,
        tags: {
          deeplink_route: 'trending',
          deeplink_variant: 'crypto',
          signed: false,
          start_source: 'unlock',
          app_start_type: 'cold',
        },
      });
    });

    it.each([
      ['wc protocol', 'wc:abc@2?relay-protocol=irn'],
      ['ethereum protocol', 'ethereum:0x123'],
      ['wc action', 'metamask://wc?uri=wc:abc'],
      ['sdk connect action', 'https://link.metamask.io/connect?foo=1'],
      ['unparseable url', 'not a url'],
    ])('does not start for a link that never navigates (%s)', (_label, url) => {
      const token = startDeeplinkNavigatedTrace({
        url,
        source: 'warm',
        appStartType: 'warm',
      });

      expect(token).toBeNull();
      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('lets the unlock entry points and startup fallback share one span', () => {
      startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });

      const second = startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });

      expect(second).toBeNull();
      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('ends on a state change whose focused chain contains the known target', () => {
      startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      resolveDeeplinkNavigatedTarget({ targetRoute: 'TRENDING_FEED' });

      handleDeeplinkNavigationStateChange({
        focusedRouteNames: ['HomeNav', 'TRENDING_FEED', 'NowTab'],
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkNavigated,
        data: {
          success: true,
          nav_target: 'known',
          target_route: 'TRENDING_FEED',
          focused_route: 'NowTab',
        },
      });
    });

    it('stays open when the focused chain misses the known target', () => {
      startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      resolveDeeplinkNavigatedTarget({ targetRoute: 'TRENDING_FEED' });

      handleDeeplinkNavigationStateChange({
        focusedRouteNames: ['HomeNav', 'Wallet'],
      });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('infers the end from the first commit after Processed closed', () => {
      startDeeplinkNavigatedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });
      startDeeplinkProcessedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });
      endDeeplinkProcessedTrace({ seam: 'handler_finished' });
      mockEndTrace.mockClear();

      handleDeeplinkNavigationStateChange({
        focusedRouteNames: ['HomeNav', 'Wallet'],
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkNavigated,
        data: {
          success: true,
          nav_target: 'inferred',
          focused_route: 'Wallet',
        },
      });
    });

    it('does not infer an end while Processed is still open', () => {
      startDeeplinkNavigatedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });
      startDeeplinkProcessedTrace({
        url: 'https://link.metamask.io/home',
        source: 'warm',
        appStartType: 'warm',
      });

      // e.g. the interstitial modal being presented commits a state change.
      handleDeeplinkNavigationStateChange({
        focusedRouteNames: ['RootModalFlow', 'DeepLinkModal'],
      });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('ignores state changes when no span is active', () => {
      handleDeeplinkNavigationStateChange({
        focusedRouteNames: ['HomeNav', 'Wallet'],
      });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('cancels only for the token that opened the span', () => {
      const staleToken = startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      cancelDeeplinkNavigatedTrace({
        reason: 'unlock_failed',
        traceToken: staleToken,
      });
      const newerToken = startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      mockEndTrace.mockClear();

      // The stale token must not cancel the newer span.
      cancelDeeplinkNavigatedTrace({
        reason: 'unlock_failed',
        traceToken: staleToken,
      });
      expect(mockEndTrace).not.toHaveBeenCalled();

      cancelDeeplinkNavigatedTrace({
        reason: 'unlock_failed',
        traceToken: newerToken,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkNavigated,
        data: { success: false, reason: 'unlock_failed' },
      });
    });

    it('is cancelled alongside a Processed cancel — the link goes nowhere', () => {
      startDeeplinkNavigatedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      startDeeplinkProcessedTrace({
        url: TRENDING_URL,
        source: 'unlock',
        appStartType: 'cold',
      });
      mockEndTrace.mockClear();

      cancelDeeplinkProcessedTrace({ reason: 'unresolved' });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.DeeplinkNavigated,
          data: expect.objectContaining({ reason: 'unresolved' }),
        }),
      );
    });
  });
});
