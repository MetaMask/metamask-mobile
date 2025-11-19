import { INotification } from '../types';

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
