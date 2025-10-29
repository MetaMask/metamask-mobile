import { UniversalRouter } from './UniversalRouter';
import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from './types/UniversalHandler';
import { CoreUniversalLink } from './types/CoreUniversalLink';
import DeeplinkManager from './DeeplinkManager';
import Logger from '../../util/Logger';

// Mock dependencies
jest.mock('../../util/Logger');
jest.mock('../SDKConnect/utils/DevLogger');
jest.mock('./CoreLinkNormalizer');

// Mock handler for testing
class MockHandler implements UniversalLinkHandler {
  id = 'mock-handler';
  supportedActions = ['test', 'multi'] as const;
  requiresAuth = false;

  handle = jest.fn<HandlerResult, [CoreUniversalLink, HandlerContext]>(() => ({
    handled: true,
  }));
}

// Mock handler that requires auth
class AuthHandler implements UniversalLinkHandler {
  id = 'auth-handler';
  supportedActions = ['secure'] as const;
  requiresAuth = true;

  handle = jest.fn<HandlerResult, [CoreUniversalLink, HandlerContext]>(() => ({
    handled: true,
  }));
}

describe('UniversalRouter', () => {
  let router: UniversalRouter;
  let mockContext: HandlerContext;
  let mockLink: CoreUniversalLink;

  beforeEach(() => {
    router = UniversalRouter.getInstance();
    router.clearRoutes();

    mockContext = {
      deeplinkManager: {} as DeeplinkManager,
      origin: 'test',
    };

    mockLink = {
      originalUrl: 'metamask://test',
      normalizedUrl: 'https://link.metamask.io/test',
      protocol: 'metamask',
      action: 'test',
      hostname: 'link.metamask.io',
      pathname: '/test',
      params: {},
      metadata: {
        source: 'test',
        timestamp: Date.now(),
        needsAuth: false,
        isSDKAction: false,
      },
    };

    // Reset mocks
    jest.clearAllMocks();
    (CoreLinkNormalizer.normalize as jest.Mock).mockReturnValue(mockLink);
  });

  describe('singleton instance', () => {
    it('returns the same instance', () => {
      const instance1 = UniversalRouter.getInstance();
      const instance2 = UniversalRouter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerHandler', () => {
    it('registers a handler for its supported actions', () => {
      const handler = new MockHandler();
      router.registerHandler(handler);

      expect(router.hasHandler('test')).toBe(true);
      expect(router.hasHandler('multi')).toBe(true);
      expect(router.getRegisteredActions()).toContain('test');
      expect(router.getRegisteredActions()).toContain('multi');
    });

    it('respects priority when registering multiple handlers', async () => {
      const handler1 = new MockHandler();
      handler1.id = 'handler-1';
      const handler2 = new MockHandler();
      handler2.id = 'handler-2';

      router.registerHandler(handler1, 10);
      router.registerHandler(handler2, 20); // Higher priority

      // Handler 2 should be tried first due to higher priority
      // Make handler1 fail so we can verify handler2 is tried first
      const callOrder: string[] = [];

      handler1.handle = jest.fn().mockImplementation(() => {
        callOrder.push('handler-1');
        return { handled: true };
      });

      handler2.handle = jest.fn().mockImplementation(() => {
        callOrder.push('handler-2');
        return { handled: false }; // Return false so handler-1 is also called
      });

      await router.routeNormalizedLink(mockLink, mockContext);

      // Handler 2 should be called first (higher priority)
      expect(callOrder).toEqual(['handler-2', 'handler-1']);
    });
  });

  describe('route', () => {
    it('successfully routes to a registered handler', async () => {
      const handler = new MockHandler();
      router.registerHandler(handler);

      const result = await router.route('metamask://test', mockContext);

      expect(CoreLinkNormalizer.normalize).toHaveBeenCalledWith(
        'metamask://test',
        'test',
      );
      expect(handler.handle).toHaveBeenCalledWith(mockLink, mockContext);
      expect(result).toEqual({ handled: true });
    });

    it('returns error when no handler is registered', async () => {
      const result = await router.route('metamask://unknown', mockContext);

      expect(result.handled).toBe(false);
      expect(result.error?.message).toContain('No handler for action');
    });

    it('tries handlers in priority order', async () => {
      const handler1 = new MockHandler();
      handler1.id = 'handler-1';
      handler1.handle.mockReturnValue({ handled: false });

      const handler2 = new MockHandler();
      handler2.id = 'handler-2';
      handler2.handle.mockReturnValue({ handled: true });

      router.registerHandler(handler1, 10);
      router.registerHandler(handler2, 5); // Lower priority

      const result = await router.route('metamask://test', mockContext);

      expect(handler1.handle).toHaveBeenCalled();
      expect(handler2.handle).toHaveBeenCalled();
      expect(result.handled).toBe(true);
    });

    it('handles errors from handlers gracefully', async () => {
      const handler = new MockHandler();
      handler.handle.mockImplementation(() => {
        throw new Error('Handler error');
      });
      router.registerHandler(handler);

      const result = await router.route('metamask://test', mockContext);

      expect(Logger.error).toHaveBeenCalled();
      expect(result.handled).toBe(false);
    });

    it('uses fallback handler when no specific handler exists', async () => {
      const fallbackHandler: UniversalLinkHandler = {
        id: 'fallback',
        supportedActions: ['*'],
        requiresAuth: false,
        handle: jest.fn<HandlerResult, [CoreUniversalLink, HandlerContext]>(
          () => ({
            handled: true,
          }),
        ),
      };

      router.setFallbackHandler(fallbackHandler);

      const result = await router.route('metamask://unknown', mockContext, {
        allowFallback: true,
      });

      expect(fallbackHandler.handle).toHaveBeenCalled();
      expect(result).toEqual({ handled: true });
    });

    it('skips auth check when skipAuth option is true', async () => {
      const handler = new AuthHandler();
      router.registerHandler(handler);

      // Mock the link to require auth
      mockLink.action = 'secure';
      mockLink.metadata.needsAuth = true;

      const result = await router.route('metamask://secure', mockContext, {
        skipAuth: true,
      });

      expect(handler.handle).toHaveBeenCalled();
      expect(result.handled).toBe(true);
    });
  });

  describe('routeNormalizedLink', () => {
    it('routes pre-normalized links without normalizing again', async () => {
      const handler = new MockHandler();
      router.registerHandler(handler);

      const result = await router.routeNormalizedLink(mockLink, mockContext);

      expect(CoreLinkNormalizer.normalize).not.toHaveBeenCalled();
      expect(handler.handle).toHaveBeenCalledWith(mockLink, mockContext);
      expect(result).toEqual({ handled: true });
    });
  });

  describe('utility methods', () => {
    it('getRegisteredActions returns all registered actions', () => {
      const handler1 = new MockHandler();
      const handler2 = new AuthHandler();

      router.registerHandler(handler1);
      router.registerHandler(handler2);

      const actions = router.getRegisteredActions();
      expect(actions).toContain('test');
      expect(actions).toContain('multi');
      expect(actions).toContain('secure');
    });

    it('hasHandler returns correct boolean', () => {
      const handler = new MockHandler();
      router.registerHandler(handler);

      expect(router.hasHandler('test')).toBe(true);
      expect(router.hasHandler('unknown')).toBe(false);
    });

    it('clearRoutes removes all handlers', () => {
      const handler = new MockHandler();
      router.registerHandler(handler);

      expect(router.hasHandler('test')).toBe(true);

      router.clearRoutes();

      expect(router.hasHandler('test')).toBe(false);
      expect(router.getRegisteredActions()).toHaveLength(0);
    });
  });
});
