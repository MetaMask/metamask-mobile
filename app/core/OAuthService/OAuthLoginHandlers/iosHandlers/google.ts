import { BaseGoogleLoginHandler } from '../shared/GoogleLoginHandler';

/**
 * IosGoogleLoginHandler is the Google login handler for iOS.
 *
 * This handler extends BaseGoogleLoginHandler and inherits all Google OAuth logic.
 * Difference from Android fallback handler is the handler name used in error messages.
 */
export class IosGoogleLoginHandler extends BaseGoogleLoginHandler {
  protected handlerName = 'IosGoogleLoginHandler';
}
