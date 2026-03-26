import Braze from '@braze/react-native-sdk';
import Logger from '../../util/Logger';

type UnsubscribeFunc = () => void;

/**
 * Subscribe to Braze push notification events (open + received).
 * Non-Braze pushes are unaffected — they continue through the existing
 * RN Firebase / Notifee pipeline.
 */
export function subscribeToBrazePushEvents(): UnsubscribeFunc {
  const subscription = Braze.addListener(
    Braze.Events.PUSH_NOTIFICATION_EVENT,
    (data) => {
      Logger.log(
        `[Braze] Push event: type=${data.payload_type}, title="${data.title}", url=${data.url}`,
      );
    },
  );

  return () => subscription.remove();
}

/**
 * Set the Braze external user ID to the MetaMask profile ID.
 * This creates/switches the Braze user so push tokens, events,
 * and attributes are associated with this identity.
 *
 * Callers are responsible for gating on sign-in state before invoking this.
 */
export async function setBrazeUser(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Engine = require('../Engine/Engine').default;
    const { AuthenticationController } = Engine.context;

    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      Braze.changeUser(sessionProfile.profileId);
      Logger.log('[Braze] User set to profileId');
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to set Braze user');
  }
}
