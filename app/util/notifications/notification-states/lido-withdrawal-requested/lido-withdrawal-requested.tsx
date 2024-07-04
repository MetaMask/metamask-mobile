import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getAmount, getNotificationBadge } from '../../notification.util';

type LidoWithdrawalRequestedNotification =
  ExtractedNotification<TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED>;

const isLidoWithdrawalRequestedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED,
]);

const state: NotificationState<LidoWithdrawalRequestedNotification> = {
  guardFn: isLidoWithdrawalRequestedNotification,
  createMenuItem: (notification) => {
    const amount = `${getAmount(
      notification.data.stake_in.amount,
      notification.data.stake_in.decimals,
      { shouldEllipse: true },
    )}`;
    const symbol = notification.data.stake_in.symbol;
    return {
      title: strings(`notifications.menu_item_title.${notification.type}`),

      description: {
        start: strings(
          `notifications.menu_item_description.${notification.type}`,
          { amount, symbol },
        ),
      },

      image: {
        url: notification.data.stake_in.image,
      },

      badgeIcon: getNotificationBadge(notification.type),

      createdAt: notification.createdAt,
    };
  },
};

export default state;
