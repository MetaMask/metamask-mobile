import {
  INotification,
  getNotificationSubtype,
} from '@metamask/notification-services-controller/notification-services';

const onChainAnalyticProperties = (item: INotification) => {
  if (
    'notification_type' in item &&
    item.notification_type === 'on-chain' &&
    item.payload?.chain_id
  ) {
    return { chain_id: item.payload.chain_id };
  }

  return undefined;
};

/**
 * Builds the analytics properties shared by every notification event so each
 * call site emits the same shape.
 *
 * `profileId` is passed in (resolved via {@link useSessionProfileId} /
 * {@link getSessionProfileId}) rather than fetched here, keeping this builder
 * synchronous and pure. It is omitted when unavailable so callers can spread
 * the result unconditionally.
 *
 * @param item - the notification the event relates to.
 * @param profileId - the current session profile ID, when available.
 * @returns the shared notification analytics properties.
 */
export function notificationAnalyticsProperties(
  item: INotification,
  profileId?: string,
) {
  return {
    notification_id: item.id,
    notification_type: item.type,
    notification_subtype: getNotificationSubtype(item),
    ...(profileId ? { profile_id: profileId } : {}),
    ...onChainAnalyticProperties(item),
  };
}

export default onChainAnalyticProperties;
