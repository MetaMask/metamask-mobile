import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../selectors/notifications';
import { store } from '../../store';
import { isNotificationsFeatureEnabled } from '../../util/notifications/constants';
import { getPushPermissionStatus } from '../../util/notifications/services/NotificationService';
import logger from '../SDKConnectV2/services/logger';
import { shouldShowCliLoginPushNudge } from './cliLoginPushNudgeRouting';
import { emitCliLoginPushNudge } from './cliLoginPushNudgeSignal';

/**
 * After a successful Agentic CLI QR login, decide whether to nudge the user to
 * enable push notifications so post-login transaction notifications reach them
 * (MMAI-925).
 *
 * When we should nudge, this emits a signal that a mounted React listener
 * ({@link CliLoginPushNudgeListener}) turns into a non-blocking toast with a
 * "Turn on" action. The nudge is skipped when the notifications feature is
 * disabled or when MetaMask in-app notifications, native push, and push
 * registration are all fully enabled.
 *
 * Fire-and-forget: never rejects; failures are logged and swallowed so the CLI
 * login flow is unaffected.
 */
export async function maybePromptPushPermissionAfterCliLogin(): Promise<void> {
  try {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    const state = store.getState();
    const nativePushStatus = await getPushPermissionStatus();
    if (
      !shouldShowCliLoginPushNudge({
        isMetamaskNotificationsEnabled:
          selectIsMetamaskNotificationsEnabled(state),
        isMetaMaskPushNotificationsEnabled:
          selectIsMetaMaskPushNotificationsEnabled(state),
        nativePushStatus,
      })
    ) {
      return;
    }

    emitCliLoginPushNudge();
  } catch (error) {
    logger.warn(
      'Failed to prompt push notification permission after CLI QR login',
      error,
    );
  }
}
