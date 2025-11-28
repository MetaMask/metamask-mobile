import { BaseHandler } from './BaseHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../../types/UniversalLinkHandler';
// Routes are accessed as needed - no import to avoid circular deps
import { ACTIONS } from '../../../../constants/deeplinks';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Handles swap deep links for token exchanges
 */
export class SwapHandler extends BaseHandler {
  readonly supportedActions = [ACTIONS.SWAP];
  readonly priority = 50; // Higher priority for core functionality

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      Logger.log('💱 SwapHandler processing swap request', link.params);

      // Check if user is authenticated
      if (link.requiresAuth && !this.isAuthenticated(context)) {
        Logger.log('Swap requires authentication');
        return {
          handled: false,
          fallbackToLegacy: true,
          metadata: { reason: 'authentication_required' },
        };
      }

      // Extract swap parameters
      const { sourceToken, destinationToken, sourceAmount, chain } =
        link.params;

      // Navigate to swap screen with parameters
      this.navigate(context, Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourceToken,
          destToken: destinationToken,
          sourceAmount,
          chainId: chain,
        },
      });

      this.trackEvent('swap_deeplink', {
        sourceToken,
        destinationToken,
        hasAmount: !!sourceAmount,
        source: link.source,
      });

      return this.createSuccessResult({
        action: ACTIONS.SWAP,
        sourceToken,
        destinationToken,
      });
    } catch (error) {
      Logger.error(error as Error, 'SwapHandler failed');
      return this.createErrorResult(error as Error);
    }
  }
}
