import { LoginHandlerCodeResult } from '../../OAuthInterface';
import { OAuthError, OAuthErrorType } from '../../error';
import { BaseGoogleLoginHandler } from '../shared/GoogleLoginHandler';
import Device from '../../../../util/device';

/**
 * IosGoogleLoginHandler is the Google login handler for iOS.
 *
 * This handler extends BaseGoogleLoginHandler and inherits all Google OAuth logic.
 * Difference from Android fallback handler is the handler name used in error messages.
 */
export class IosGoogleLoginHandler extends BaseGoogleLoginHandler {
  protected handlerName = 'IosGoogleLoginHandler';

  async login(): Promise<LoginHandlerCodeResult> {
    if (Device.isIos() && Device.comparePlatformVersionTo('17.4') < 0) {
      throw new OAuthError(
        'IosGoogleLoginHandler: Google login requires iOS 17.4 or later',
        OAuthErrorType.IosGoogleLoginNotSupported,
      );
    }

    return super.login();
  }
}
