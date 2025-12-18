import { BaseHandler } from '../BaseHandler';
import { CoreUniversalLink } from '../../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../../../types/UniversalLinkHandler';
import { createMockContext, createMockLink } from '../../../utils/testUtils';
import Engine from '../../../../Engine';
import type { KeyringControllerState } from '@metamask/keyring-controller';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../Engine', () => ({
  context: {
    KeyringController: {
      state: {
        isUnlocked: true,
      },
    },
  },
}));

class TestHandler extends BaseHandler {
  readonly supportedActions = ['test'];
  readonly priority = 10;

  async handle(
    _link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    this.navigate(context, 'TestScreen', { test: true });
    return this.createSuccessResult({ test: true });
  }

  testIsAuthenticated(context: HandlerContext): boolean {
    return this.isAuthenticated(context);
  }

  testValidateParams(link: CoreUniversalLink, required: string[]): void {
    return this.validateParams(link, required);
  }
}

describe('BaseHandler', () => {
  let handler: TestHandler;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new TestHandler();
    mockContext = createMockContext();
  });

  describe('isAuthenticated', () => {
    it('returns true when wallet is unlocked', () => {
      expect(handler.testIsAuthenticated(mockContext)).toBe(true);
    });

    it('returns false when wallet is locked', () => {
      // Override the mock to simulate locked state
      const state = Engine.context.KeyringController
        .state as KeyringControllerState;
      state.isUnlocked = false;
      expect(handler.testIsAuthenticated(mockContext)).toBe(false);
      // Reset for other tests
      state.isUnlocked = true;
    });
  });

  describe('validateParams', () => {
    it('throws error when required params are missing', () => {
      const link = createMockLink('test');
      expect(() => {
        handler.testValidateParams(link, ['required']);
      }).toThrow('Missing required parameters: required');
    });
  });
});
