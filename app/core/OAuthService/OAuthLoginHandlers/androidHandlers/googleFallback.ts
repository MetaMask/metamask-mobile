import { BaseGoogleLoginHandler } from '../shared/GoogleLoginHandler';

/**
 * AndroidGoogleFallbackLoginHandler is the browser-based fallback handler for Google login on Android.
 * Used when Android Credential Manager (ACM) fails (e.g., no Google account on device).
 *
 * This handler extends BaseGoogleLoginHandler and inherits all Google OAuth logic.
 */
export class AndroidGoogleFallbackLoginHandler extends BaseGoogleLoginHandler {
  protected handlerName = 'AndroidGoogleFallbackLoginHandler';
}
