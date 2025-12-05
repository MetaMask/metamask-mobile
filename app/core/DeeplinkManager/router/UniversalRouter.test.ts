import { UniversalRouter } from '../router/UniversalRouter';
import { HandlerRegistry } from '../registry/HandlerRegistry';
import { CoreLinkNormalizer } from '../normalization/CoreLinkNormalizer';
import { LegacyLinkAdapter } from '../normalization/LegacyLinkAdapter';
import {
  UniversalLinkHandler,
  HandlerContext,
  HandlerResult,
} from '../types/UniversalLinkHandler';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { ACTIONS } from '../../../constants/deeplinks';
import ReduxService from '../../redux';

// Mock dependencies
jest.mock('../normalization/CoreLinkNormalizer');
jest.mock('../normalization/LegacyLinkAdapter');
jest.mock('../../../util/Logger');
jest.mock('../../Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      trackEvent: jest.fn(),
    })),
  },
}));
jest.mock('../../Analytics/MetricsEventBuilder');
jest.mock('../../redux');
jest.mock('../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({ MM_UNIVERSAL_ROUTER: true })),
}));

// Mock handler for testing
class MockHandler extends UniversalLinkHandler {
  public supportedActions: string[];
  public priority: number;
  public handleFn?: jest.Mock;

  constructor(
    supportedActions: string[],
    priority: number,
    handleFn?: jest.Mock,
  ) {
    super();
    this.supportedActions = supportedActions;
    this.priority = priority;
    this.handleFn = handleFn;
  }

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    if (this.handleFn) {
      return this.handleFn(link, context);
    }
    return { handled: true };
  }
}

describe('UniversalRouter', () => {
  let router: UniversalRouter;
  let mockContext: HandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get fresh instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (UniversalRouter as any).instance = undefined;
    router = UniversalRouter.getInstance();
    router.reset();

    mockContext = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
      instance: {},
      featureFlags: { MM_UNIVERSAL_ROUTER: true },
    };

    // Setup default mocks
    (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue({
      action: ACTIONS.HOME,
      source: 'test',
      protocol: 'metamask',
      params: {},
      requiresAuth: false,
    });

    (LegacyLinkAdapter.shouldUseNewSystem as jest.Mock).mockReturnValue(true);
    (LegacyLinkAdapter.toLegacyFormat as jest.Mock).mockReturnValue({
      urlObj: new URL('metamask://home'),
      params: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LegacyLinkAdapter as any).createHandlerContext = jest
      .fn()
      .mockReturnValue({
        handled: jest.fn(),
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ReduxService.store as any) = {
      getState: jest.fn(() => ({})),
    };
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = UniversalRouter.getInstance();
      const instance2 = UniversalRouter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('throws error and remains uninitialized when handler registration fails', () => {
      const registrationError = new Error('Handler registration failed');
      jest.spyOn(router.getRegistry(), 'register').mockImplementation(() => {
        throw registrationError;
      });

      expect(() => router.initialize()).toThrow('Handler registration failed');

      jest.restoreAllMocks();

      expect(() => router.initialize()).not.toThrow();
    });
  });

  describe('route', () => {
    it('routes to handler based on action', async () => {
      const handleFn = jest.fn(() => ({
        handled: true,
        metadata: { test: true },
      }));
      const handler = new MockHandler([ACTIONS.HOME], 10, handleFn);

      // Don't call initialize() to avoid built-in handlers
      router.getRegistry().register(handler);

      const result = await router.route('metamask://home', 'test', mockContext);

      expect(handleFn).toHaveBeenCalled();
      expect(result.handled).toBe(true);
      expect(result.metadata?.test).toBe(true);
    });

    it('executes handlers in priority order', async () => {
      const results: string[] = [];

      const handler1 = new MockHandler(
        [ACTIONS.HOME],
        20,
        jest.fn(() => {
          results.push('handler1');
          return { handled: false };
        }),
      );

      const handler2 = new MockHandler(
        [ACTIONS.HOME],
        10,
        jest.fn(() => {
          results.push('handler2');
          return { handled: true };
        }),
      );

      const handler3 = new MockHandler(
        [ACTIONS.HOME],
        30,
        jest.fn(() => {
          results.push('handler3');
          return { handled: false };
        }),
      );

      // Don't call initialize() to avoid built-in handlers
      router.getRegistry().register(handler1);
      router.getRegistry().register(handler2);
      router.getRegistry().register(handler3);

      await router.route('metamask://home', 'test', mockContext);

      expect(results).toEqual(['handler2']); // Only handler2 runs (priority 10)
    });

    it('falls back to legacy when no handler found', async () => {
      (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue({
        action: 'unknown-action',
        source: 'test',
        protocol: 'metamask',
        params: {},
        requiresAuth: false,
      });

      const result = await router.route(
        'metamask://unknown',
        'test',
        mockContext,
      );

      expect(result.handled).toBe(true);
      expect(result.metadata?.usedLegacy).toBe(true);
    });

    it('handles errors gracefully', async () => {
      (CoreLinkNormalizer.normalize as jest.Mock).mockImplementation(() => {
        throw new Error('Normalization failed');
      });

      const result = await router.route('invalid://url', 'test', mockContext);

      expect(result.handled).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('delegates to legacy when handler requests fallback', async () => {
      const handleFn = jest.fn(() => ({
        handled: false,
        fallbackToLegacy: true,
        metadata: { reason: 'authentication_required' },
      }));
      const handler = new MockHandler([ACTIONS.HOME], 10, handleFn);

      // Don't call initialize() to avoid built-in handlers
      router.getRegistry().register(handler);

      const result = await router.route('metamask://home', 'test', mockContext);

      expect(handleFn).toHaveBeenCalled();
      expect(result.handled).toBe(true);
      expect(result.metadata?.usedLegacy).toBe(true);
    });
  });

  describe('getRegistry', () => {
    it('returns handler registry', () => {
      const registry = router.getRegistry();
      expect(registry).toBeInstanceOf(HandlerRegistry);
    });
  });

  describe('reset', () => {
    it('clears registry and initialization state', () => {
      router.initialize();
      const handler = new MockHandler(['test'], 10);
      router.getRegistry().register(handler);

      router.reset();

      expect(router.getRegistry().getRegisteredActions()).toHaveLength(0);
    });
  });
});
