import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getAmount, getNotificationBadge } from '../../notification.util';

type SwapCompletedNotification =
  ExtractedNotification<TRIGGER_TYPES.METAMASK_SWAP_COMPLETED>;

const isSwapCompletedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.METAMASK_SWAP_COMPLETED,
]);

const state: NotificationState<SwapCompletedNotification> = {
  guardFn: isSwapCompletedNotification,
  createMenuItem: (notification) => ({
    title: strings(`notifications.menu_item_title.${notification.type}`, {
      symbol1: notification.data.token_in.symbol,
      symbol2: notification.data.token_out.symbol,
    }),

    description: {
      start: notification.data.token_out.symbol,
      end: `${getAmount(
        notification.data.token_out.amount,
        notification.data.token_out.decimals,
        {
          shouldEllipse: true,
        },
      )} ${notification.data.token_out.symbol}`,
    },

    image: {
      url: notification.data.token_out.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt,
  }),
};

export default state;
