import { SendHandler } from './SendHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { HandlerContext } from '../interfaces/UniversalLinkHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../../../../util/Logger');

describe('SendHandler', () => {
  let handler: SendHandler;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new SendHandler();
    mockContext = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
      instance: {
        context: {
          KeyringController: { isUnlocked: jest.fn(() => true) },
        },
      },
    };
  });

  const createSendLink = (
    action: string = ACTIONS.SEND,
    params = {},
  ): CoreUniversalLink => ({
    action,
    protocol: 'metamask',
    params,
    requiresAuth: true,
    source: 'test',
    timestamp: Date.now(),
    originalUrl: `metamask://${action}`,
    normalizedUrl: `metamask://${action}`,
    isValid: true,
    isSupportedAction: true,
    isPrivateLink: false,
  });

  describe('SEND action', () => {
    it('navigates to send flow with full params', async () => {
      const link = createSendLink(ACTIONS.SEND, {
        to: '0x123',
        value: '1.5',
        chainId: '0x1',
      });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'SendFlowView',
        {
          screen: Routes.SEND_FLOW.SEND_TO,
          params: {
            address: '0x123',
            amount: '1.5',
            chainId: '0x1',
          },
        },
      );
    });

    it('navigates to send flow with minimal params', async () => {
      const link = createSendLink(ACTIONS.SEND, { to: '0xabc' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'SendFlowView',
        {
          screen: Routes.SEND_FLOW.SEND_TO,
          params: {
            address: '0xabc',
            amount: undefined,
            chainId: undefined,
          },
        },
      );
    });

    it('throws error when required "to" param is missing', async () => {
      const link = createSendLink(ACTIONS.SEND, { value: '1.5' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.error?.message).toContain(
        'Missing required parameters: to',
      );
    });

    it('requires authentication', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockContext.instance as any).context.KeyringController.isUnlocked =
        jest.fn(() => false);
      const link = createSendLink(ACTIONS.SEND, { to: '0x123' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.fallbackToLegacy).toBe(true);
      expect(result.metadata?.reason).toBe('authentication_required');
    });
  });

  describe('APPROVE action', () => {
    it('delegates to legacy system', async () => {
      const link = createSendLink(ACTIONS.APPROVE, {
        to: '0x123',
        data: '0xabc',
      });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.fallbackToLegacy).toBe(true);
      expect(result.metadata?.reason).toBe('approve_requires_transaction');
    });
  });

  describe('supportedActions', () => {
    it('supports SEND and APPROVE actions', () => {
      expect(handler.supportedActions).toEqual([ACTIONS.SEND, ACTIONS.APPROVE]);
    });
  });

  describe('priority', () => {
    it('has high priority for core functionality', () => {
      expect(handler.priority).toBe(50);
    });
  });
});
