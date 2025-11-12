import { BaseHandler } from './BaseHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../interfaces/UniversalLinkHandler';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/Logger');

// Concrete implementation for testing
class TestHandler extends BaseHandler {
  readonly supportedActions = ['test'];
  readonly priority = 10;

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    if (link.action === 'test') {
      this.navigate(context, 'TestScreen', { test: true });
      return this.createSuccessResult({ test: true });
    }
    return this.createErrorResult(new Error('Not handled'));
  }

  // Expose protected methods for testing
  testIsAuthenticated(context: HandlerContext): boolean {
    return this.isAuthenticated(context);
  }

  testCreateSuccessResult(metadata?: Record<string, unknown>): HandlerResult {
    return this.createSuccessResult(metadata);
  }

  testCreateErrorResult(error: Error, fallbackToLegacy = true): HandlerResult {
    return this.createErrorResult(error, fallbackToLegacy);
  }

  testValidateParams(link: CoreUniversalLink, required: string[]): void {
    return this.validateParams(link, required);
  }
}

describe('BaseHandler', () => {
  let handler: TestHandler;
  let mockContext: HandlerContext;
  let mockLink: CoreUniversalLink;

  beforeEach(() => {
    handler = new TestHandler();
    mockContext = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
      instance: {
        context: {
          KeyringController: { isUnlocked: jest.fn(() => true) },
        },
      },
    };
    mockLink = {
      action: 'test',
      protocol: 'metamask',
      params: {},
      requiresAuth: false,
      source: 'test',
      timestamp: Date.now(),
      originalUrl: 'metamask://test',
      normalizedUrl: 'metamask://test',
      isValid: true,
      isSupportedAction: true,
      isPrivateLink: false,
    };
  });

  describe('navigate', () => {
    it('navigates to specified route with params', async () => {
      await handler.handle(mockLink, mockContext);

      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'TestScreen',
        { test: true },
      );
    });

    it('logs navigation', async () => {
      await handler.handle(mockLink, mockContext);

      expect(Logger.log).toHaveBeenCalledWith('🔗 Navigated to TestScreen', {
        test: true,
      });
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when wallet is unlocked', () => {
      const result = handler.testIsAuthenticated(mockContext);
      expect(result).toBe(true);
    });

    it('returns false when wallet is locked', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockContext.instance as any).context.KeyringController.isUnlocked =
        jest.fn(() => false);

      const result = handler.testIsAuthenticated(mockContext);
      expect(result).toBe(false);
    });

    it('returns false when KeyringController not available', () => {
      mockContext.instance = {};

      const result = handler.testIsAuthenticated(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('createSuccessResult', () => {
    it('creates success result with metadata', () => {
      const result = handler.testCreateSuccessResult({ custom: 'data' });

      expect(result.handled).toBe(true);
      expect(result.metadata).toMatchObject({
        handler: 'TestHandler',
        custom: 'data',
      });
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });

  describe('createErrorResult', () => {
    it('creates error result with error details', () => {
      const error = new Error('Test error');
      const result = handler.testCreateErrorResult(error);

      expect(result).toMatchObject({
        handled: false,
        fallbackToLegacy: true,
        error,
        metadata: {
          errorMessage: 'Test error',
        },
      });
    });
  });

  describe('validateParams', () => {
    it('throws error when required params are missing', () => {
      expect(() => {
        handler.testValidateParams(mockLink, ['required']);
      }).toThrow('Missing required parameters: required');
    });

    it('does not throw when all params present', () => {
      mockLink.params = { required: 'value' };

      expect(() => {
        handler.testValidateParams(mockLink, ['required']);
      }).not.toThrow();
    });
  });
});
