import { SwapHandler } from './SwapHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { HandlerContext } from '../interfaces/UniversalLinkHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
// Route constants used in SwapHandler

jest.mock('../../../../util/Logger');

describe('SwapHandler', () => {
  let handler: SwapHandler;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new SwapHandler();
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

  const createSwapLink = (params = {}): CoreUniversalLink => ({
    action: ACTIONS.SWAP,
    protocol: 'metamask',
    params,
    requiresAuth: true,
    source: 'test',
    timestamp: Date.now(),
    originalUrl: 'metamask://swap',
    normalizedUrl: 'metamask://swap',
    isValid: true,
    isSupportedAction: true,
    isPrivateLink: false,
  });

  describe('handle', () => {
    it('navigates to swap screen with full params', async () => {
      const link = createSwapLink({
        sourceToken: 'ETH',
        destinationToken: 'USDC',
        sourceAmount: '1',
        slippage: '1',
        chain: '0x1',
      });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'SwapsView',
        {
          screen: 'SwapsAmountView',
          params: {
            sourceToken: 'ETH',
            destinationToken: 'USDC',
            sourceAmount: '1',
            slippage: '1',
            chainId: '0x1',
          },
        },
      );
    });

    it('uses default slippage when not provided', async () => {
      const link = createSwapLink({
        sourceToken: 'ETH',
        destinationToken: 'USDC',
      });

      await handler.handle(link, mockContext);

      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'SwapsView',
        {
          screen: 'SwapsAmountView',
          params: {
            sourceToken: 'ETH',
            destinationToken: 'USDC',
            sourceAmount: undefined,
            slippage: '0.5',
            chainId: undefined,
          },
        },
      );
    });

    it('requires authentication when link requires auth', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockContext.instance as any).context.KeyringController.isUnlocked =
        jest.fn(() => false);
      const link = createSwapLink();

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.fallbackToLegacy).toBe(true);
      expect(result.metadata?.reason).toBe('authentication_required');
    });
  });
});
