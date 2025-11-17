import { SwapHandler } from './SwapHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import { createMockContext, createMockLink } from '../testUtils';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../Engine';

jest.mock('../../../../util/Logger');
jest.mock('../../../Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn(() => true),
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
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(Routes.SWAPS, {
      screen: Routes.SWAPS_AMOUNT_VIEW,
      params: {
        sourceToken: 'ETH',
        destinationToken: 'USDC',
        sourceAmount: '1',
        chainId: undefined,
      },
    });
  });

  it('requires authentication for swap', async () => {
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      false,
    );
    const link = createMockLink(ACTIONS.SWAP, {}, true);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.fallbackToLegacy).toBe(true);
    expect(result.metadata?.reason).toBe('authentication_required');
  });
});
