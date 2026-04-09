import { INotification } from '@metamask/notification-services-controller/notification-services';

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

export default onChainAnalyticProperties;
