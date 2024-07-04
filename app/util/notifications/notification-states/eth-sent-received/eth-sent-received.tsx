import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
  shortenAddress,
  formatAmount,
} from '../../notification.util';

type NativeSentReceiveNotification = ExtractedNotification<
  TRIGGER_TYPES.ETH_RECEIVED | TRIGGER_TYPES.ETH_SENT
>;
const isNativeTokenNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ETH_RECEIVED,
  TRIGGER_TYPES.ETH_SENT,
]);

const isSent = (n: NativeSentReceiveNotification) =>
  n.type === TRIGGER_TYPES.ETH_SENT;

const title = (n: NativeSentReceiveNotification) => {
  const address = shortenAddress(isSent(n) ? n.data.to : n.data.from);
  return strings(`notifications.menu_item_title.${n.type}`, {
    address,
  });
};

const state: NotificationState<NativeSentReceiveNotification> = {
  guardFn: isNativeTokenNotification,
  createMenuItem: (notification) => {
    const tokenDetails = getNativeTokenDetailsByChainId(notification.chain_id);

    return {
      title: title(notification),

      description: {
        start: tokenDetails?.name ?? '',
        end: tokenDetails
          ? `${formatAmount(parseFloat(notification.data.amount.eth), {
              shouldEllipse: true,
            })} ${tokenDetails.symbol}`
          : '',
      },

      image: {
        url: tokenDetails?.image,
      },

      badgeIcon: getNotificationBadge(notification.type),

      createdAt: notification.createdAt,
    };
  },
};

export default state;
