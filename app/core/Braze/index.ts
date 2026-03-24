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
