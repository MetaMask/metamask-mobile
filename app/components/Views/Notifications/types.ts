import type { NotificationsActionsTypes } from '../Settings/NotificationsSettings/NotificationsSettings.constants';
import NotificationTypes from '../../../util/notifications';
import { IconName } from '../../../component-library/components/Icons/Icon';

import type { TransactionMeta } from '@metamask/transaction-controller';

interface FcmMeta {
  title: string;
  message: string;
  imageUri?: string;

  cta?: {
    label: string;
    onPress: () => void;
    icon?: IconName;
  };
}
export interface Notification {
  id: string;
  isVisible: boolean;
  autodismiss: number;
  status: string;
  type: NotificationTypes;
  actionsType: NotificationsActionsTypes;
  timestamp: string;
  data: {
    transactionMeta?: TransactionMeta;
    fcmMeta?: FcmMeta;
  };
}
