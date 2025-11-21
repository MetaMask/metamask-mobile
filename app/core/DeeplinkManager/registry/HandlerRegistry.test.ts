import { HandlerRegistry } from './HandlerRegistry';
import {
  UniversalLinkHandler,
  HandlerContext,
  HandlerResult,
} from '../types/UniversalLinkHandler';
import { CoreUniversalLink } from '../types/CoreUniversalLink';

// Mock Logger
jest.mock('../../../util/Logger');

// Mock handler for testing
class MockHandler extends UniversalLinkHandler {
  public supportedActions: string[];
  public priority: number;
  public handleFn?: (
    link: CoreUniversalLink,
    context: HandlerContext,
  ) => Promise<HandlerResult>;

  constructor(
    supportedActions: string[],
    priority: number,
    handleFn?: (
      link: CoreUniversalLink,
      context: HandlerContext,
    ) => Promise<HandlerResult>,
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

  canHandle(link: CoreUniversalLink): boolean {
    return this.supportedActions.includes(link.action);
  }
}

// Helper to create mock links
const createMockLink = (action: string): CoreUniversalLink => ({
  action,
  source: 'test',
  protocol: 'metamask',
  params: {},
  requiresAuth: false,
  timestamp: Date.now(),
  originalUrl: `metamask://${action}`,
  normalizedUrl: `metamask://${action}`,
  isValid: true,
  isSupportedAction: true,
  isPrivateLink: false,
});

describe('HandlerRegistry', () => {
  let registry: HandlerRegistry;

  beforeEach(() => {
    registry = new HandlerRegistry();
  });

  describe('register', () => {
    it('registers handler for its supported actions', () => {
      const handler = new MockHandler(['action1', 'action2'], 10);
      registry.register(handler);

      expect(registry.getRegisteredActions()).toContain('action1');
      expect(registry.getRegisteredActions()).toContain('action2');
    });

    it('sorts handlers by priority', () => {
      const handler1 = new MockHandler(['action'], 20);
      const handler2 = new MockHandler(['action'], 10);
      const handler3 = new MockHandler(['action'], 30);

      registry.register(handler1);
      registry.register(handler2);
      registry.register(handler3);

      const handlers = registry.findHandlers(createMockLink('action'));

      expect(handlers[0]).toBe(handler2); // priority 10
      expect(handlers[1]).toBe(handler1); // priority 20
      expect(handlers[2]).toBe(handler3); // priority 30
    });
  });

  describe('findHandlers', () => {
    it('finds handlers for specific action', () => {
      const handler1 = new MockHandler(['action1'], 10);
      const handler2 = new MockHandler(['action2'], 10);

      registry.register(handler1);
      registry.register(handler2);

      const handlers = registry.findHandlers(createMockLink('action1'));

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler1);
    });

    it('returns empty array for unsupported action', () => {
      const handler = new MockHandler(['action1'], 10);
      registry.register(handler);

      const handlers = registry.findHandlers(createMockLink('unknown'));

      expect(handlers).toHaveLength(0);
    });

    it('deduplicates handler registered both globally and for specific action', () => {
      const handler = new MockHandler(['action1'], 10);

      registry.registerGlobal(handler);
      registry.register(handler);

      const handlers = registry.findHandlers(createMockLink('action1'));

      // Should only appear once, not twice
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });
  });

  describe('unregister', () => {
    it('removes handler from all registered actions', () => {
      const handler = new MockHandler(['action1', 'action2'], 10);

      registry.register(handler);
      expect(registry.getRegisteredActions()).toContain('action1');
      expect(registry.getRegisteredActions()).toContain('action2');

      registry.unregister(handler);
      expect(registry.getRegisteredActions()).not.toContain('action1');
      expect(registry.getRegisteredActions()).not.toContain('action2');
    });
  });

  describe('clear', () => {
    it('removes all handlers', () => {
      const handler1 = new MockHandler(['action1'], 10);
      const handler2 = new MockHandler(['action2'], 10);

      registry.register(handler1);
      registry.register(handler2);

      registry.clear();

      expect(registry.getRegisteredActions()).toHaveLength(0);
    });
  });
});
