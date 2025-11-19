import { BaseHandler } from './BaseHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../interfaces/UniversalLinkHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';

/**
 * Handles home deeplinks for navigating to wallet home
 *
 * Supported formats:
 * - metamask://home
 * - metamask://home?previewToken=abc123
 * - https://link.metamask.io/home
 * - https://link.metamask.io/home?previewToken=abc123
 */
export class HomeHandler extends BaseHandler {
  /**
   * Actions this handler supports
   */
  readonly supportedActions = [ACTIONS.HOME];

  /**
   * Handler priority (lower = higher priority)
   * Navigation handlers typically use priority 100
   */
  readonly priority = 100;

  /**
   * Handle home navigation deeplinks
   */
  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      Logger.log('🏠 HomeHandler processing home navigation', link.params);

      // Extract preview token if present
      const { previewToken } = link.params;

      // Set preview token for notification content if provided
      if (previewToken) {
        setContentPreviewToken(previewToken as string);
        Logger.log('Set content preview token:', previewToken);
      }

      // Navigate to wallet home
      this.navigate(context, Routes.WALLET.HOME);

      // Track analytics
      this.trackEvent('deeplink_home', {
        action: link.action,
        source: link.source,
        hasPreviewToken: !!previewToken,
      });

      return this.createSuccessResult({
        action: ACTIONS.HOME,
        previewToken: previewToken || null,
      });
    } catch (error) {
      Logger.error(error as Error, 'HomeHandler failed');
      return this.createErrorResult(error as Error);
    }
  }
}

