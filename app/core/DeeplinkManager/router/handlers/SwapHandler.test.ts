import { SwapHandler } from './SwapHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import {
  createMockContext,
  createMockLink,
  mockLockedWallet,
} from '../testUtils';

jest.mock('../../../../util/Logger');

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
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith('SwapsView', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: 'ETH',
        destinationToken: 'USDC',
        sourceAmount: '1',
        slippage: '0.5',
        chainId: undefined,
      },
    });
  });

  it('uses default slippage when not provided', async () => {
    const link = createMockLink(
      ACTIONS.SWAP,
      { sourceToken: 'ETH', destinationToken: 'USDC' },
      true,
    );

    await handler.handle(link, mockContext);

    const callArgs = (mockContext.navigation.navigate as jest.Mock).mock
      .calls[0][1];
    expect(callArgs.params.slippage).toBe('0.5');
  });

  it('requires authentication for swap', async () => {
    mockLockedWallet(mockContext);
    const link = createMockLink(ACTIONS.SWAP, {}, true);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.fallbackToLegacy).toBe(true);
    expect(result.metadata?.reason).toBe('authentication_required');
  });
});
