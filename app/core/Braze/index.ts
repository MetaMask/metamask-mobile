import Braze from '@braze/react-native-sdk';
import Logger from '../../util/Logger';

type UnsubscribeFunc = () => void;

const BRAZE_PROFILE_ID_ATTRIBUTE = 'profile_id';

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
 * Sync the MetaMask profile ID to Braze as a custom user attribute.
 * This allows the marketing team to segment users by their authenticated
 * profile while keeping the analytics UUID as the Braze external_id.
 *
 * Callers are responsible for gating on sign-in state before invoking this.
 */
export async function syncBrazeProfileId(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Engine = require('../Engine/Engine').default;
    const { AuthenticationController } = Engine.context;

    const sessionProfile = await AuthenticationController.getSessionProfile();
    Logger.log('[Braze] syncBrazeProfileId', sessionProfile?.profileId);
    if (sessionProfile?.profileId) {
      Braze.setCustomUserAttribute(
        BRAZE_PROFILE_ID_ATTRIBUTE,
        sessionProfile.profileId,
      );
      Logger.log('[Braze] Profile ID synced as custom attribute');
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to sync profile ID');
  }
}

/**
 * Clear the MetaMask profile ID from Braze when the user signs out.
 */
export function clearBrazeProfileId(): void {
  try {
    Braze.setCustomUserAttribute(BRAZE_PROFILE_ID_ATTRIBUTE, null);
    Logger.log('[Braze] Profile ID cleared');
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to clear profile ID');
  }
}
