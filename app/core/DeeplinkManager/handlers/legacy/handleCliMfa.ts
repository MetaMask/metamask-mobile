import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type { Intent } from '../../../../components/Views/MfaWebview/types';

/**
 * Handles `https://link.metamask.io/cli-login` and `/cli-approve` deeplinks.
 *
 * Expected query string:
 * `?sessionId=<uuid>&server=<urlencoded-base-url>`
 *
 * `server` is the backend's public base URL — e.g. `http://10.0.2.2:3000` for
 * the local mock, or the real prod host once it lands. Carrying it in the
 * deeplink keeps mobile env-agnostic.
 *
 * The pending-deeplink saga (app/store/sagas/index.ts) gates this on
 * vault-unlocked + onboarding-complete, so by the time we run we know the
 * AuthenticationController can issue a bearer.
 */
export const handleCliMfa = (params: {
  intent: Intent;
  sessionId?: string;
  server?: string;
}): void => {
  const { intent, sessionId, server } = params;
  DevLogger.log('[handleCliMfa] starting', { intent, sessionId, server });

  if (!sessionId || !server) {
    Logger.error(
      new Error('handleCliMfa: missing sessionId or server param'),
      `intent=${intent}`,
    );
    return;
  }

  let decodedServer: string;
  try {
    decodedServer = decodeURIComponent(server);
  } catch (err) {
    Logger.error(err as Error, 'handleCliMfa: failed to decode server param');
    return;
  }

  // The 200ms gap mirrors `handleDeeplinkSaga`'s setTimeout — gives any
  // ongoing navigation transition time to settle before we push our screen.
  setTimeout(() => {
    NavigationService.navigation?.navigate(Routes.MFA_WEBVIEW.CONFIRM, {
      sessionId,
      server: decodedServer,
      intent,
    });
  }, 200);
};
