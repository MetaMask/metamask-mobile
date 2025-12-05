import { BaseHandler } from './BaseHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../../types/UniversalLinkHandler';
import Routes from '../../../../constants/navigation/Routes';
import { ACTIONS } from '../../../../constants/deeplinks';
import Logger from '../../../../util/Logger';

/**
 * Handles send/transaction deep links
 */
export class SendHandler extends BaseHandler {
  readonly supportedActions = [ACTIONS.SEND, ACTIONS.APPROVE];
  readonly priority = 50; // Higher priority for core functionality

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      Logger.log(`💸 SendHandler processing: ${link.action}`, link.params);

      // Check for APPROVE action first - delegate to legacy immediately
      if (link.action === ACTIONS.APPROVE) {
        // ethereum: syntax
        // Approve requires transaction creation, delegate to legacy
        Logger.log('Approve action requires legacy system');
        return {
          handled: false,
          fallbackToLegacy: true,
          metadata: { reason: 'approve_requires_transaction' },
        };
      }

      // Authentication is required for send
      if (!this.isAuthenticated(context)) {
        Logger.log('Send requires authentication');
        return {
          handled: false,
          fallbackToLegacy: true,
          metadata: { reason: 'authentication_required' },
        };
      }

      const { to, value, chainId } = link.params;

      if (link.action === ACTIONS.SEND) {
        // Validate required params for send
        this.validateParams(link, ['to']);

        // Navigate to send flow
        // currently *no constants* for send flow route
        this.navigate(context, 'SendFlowView', {
          screen: Routes.SEND_FLOW.SEND_TO,
          params: {
            address: to,
            amount: value,
            chainId,
          },
        });

        this.trackEvent('send_deeplink', {
          hasAmount: !!value,
          hasChainId: !!chainId,
          source: link.source,
        });
      }

      return this.createSuccessResult({
        action: link.action,
        to,
        value,
      });
    } catch (error) {
      Logger.error(error as Error, 'SendHandler failed');
      return this.createErrorResult(error as Error);
    }
  }
}
