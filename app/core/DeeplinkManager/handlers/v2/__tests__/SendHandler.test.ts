import { SendHandler } from '../SendHandler';
import { ACTIONS } from '../../../../../constants/deeplinks';
import Routes from '../../../../../constants/navigation/Routes';
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

describe('SendHandler', () => {
  let handler: SendHandler;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    handler = new SendHandler();
    mockContext = createMockContext();
  });

  describe('SEND action', () => {
    it('navigates to send flow with address', async () => {
      const link = createMockLink(
        ACTIONS.SEND,
        { to: '0x123', value: '1.5' },
        true,
      );

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'SendFlowView', // currently no route
        {
          screen: Routes.SEND_FLOW.SEND_TO,
          params: { address: '0x123', amount: '1.5', chainId: undefined },
        },
      );
    });

    it('throws error when required "to" param is missing', async () => {
      const link = createMockLink(ACTIONS.SEND, { value: '1.5' }, true);

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.error?.message).toContain(
        'Missing required parameters: to',
      );
    });

    it('requires authentication for send transactions', async () => {
      const state = Engine.context.KeyringController
        .state as KeyringControllerState;
      state.isUnlocked = false;
      const link = createMockLink(ACTIONS.SEND, { to: '0x123' }, true);

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.fallbackToLegacy).toBe(true);
      expect(result.metadata?.reason).toBe('authentication_required');
    });
  });

  describe('APPROVE action', () => {
    it('delegates to legacy system', async () => {
      const link = createMockLink(ACTIONS.APPROVE, {
        to: '0x123',
        data: '0xabc',
      });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.fallbackToLegacy).toBe(true);
      expect(result.metadata?.reason).toBe('approve_requires_transaction');
    });
  });
});
