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

/** Shared analytics properties for every notification event, so each call site emits the same shape. */
export function notificationAnalyticsProperties(item: INotification) {
  return {
    notification_id: item.id,
    notification_type: item.type,
    notification_subtype: getNotificationSubtype(item),
    ...onChainAnalyticProperties(item),
  };
}

export default onChainAnalyticProperties;
