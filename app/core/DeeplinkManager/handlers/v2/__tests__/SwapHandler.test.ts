import { SwapHandler } from '../SwapHandler';
import { ACTIONS } from '../../../../../constants/deeplinks';
import { createMockContext, createMockLink } from '../../../utils/testUtils';
import Routes from '../../../../../constants/navigation/Routes';
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

describe('SwapHandler', () => {
  let handler: SwapHandler;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    handler = new SwapHandler();
    mockContext = createMockContext();
  });

  it('navigates to swap with tokens', async () => {
    const link = createMockLink(
      ACTIONS.SWAP,
      { sourceToken: 'ETH', destinationToken: 'USDC', sourceAmount: '1' },
      true,
    );

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourceToken: 'ETH',
          destToken: 'USDC',
          sourceAmount: '1',
          chainId: undefined,
        },
      },
    );
  });

  it('requires authentication for swap', async () => {
    const state = Engine.context.KeyringController
      .state as KeyringControllerState;
    state.isUnlocked = false;
    const link = createMockLink(ACTIONS.SWAP, {}, true);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.fallbackToLegacy).toBe(true);
    expect(result.metadata?.reason).toBe('authentication_required');
  });
});
