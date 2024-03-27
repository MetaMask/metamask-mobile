import { getBlockExplorerTxUrl } from '../../../../util/networks';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { NotificationsActionsTypes } from '../../Settings/NotificationsSettings/NotificationsSettings.constants';
import Logger from '../../../../util/Logger';
import { Theme } from '../../../../util/theme/models';

interface ViewOnEtherscanProps {
  navigation: any;
  transactionObject: {
    networkID: string;
  };
  transactionDetails: {
    transactionHash: string;
  };
  providerConfig: {
    type: string;
  };
  close?: () => void;
}

export const sortNotifications = (notifications: any[]): any[] =>
  notifications.sort((a, b) =>
    a.timestamp > b.timestamp ? -1 : b.timestamp > a.timestamp ? 1 : 0,
  );

export const NotificationActionBadgeSource = (action: string) => {
  switch (action) {
    case NotificationsActionsTypes.SENT:
      return IconName.Arrow2Upright;
    case NotificationsActionsTypes.RECEIVED:
      return IconName.Received;
    case NotificationsActionsTypes.SWAPED:
      return IconName.SwapHorizontal;
    case NotificationsActionsTypes.DEFI:
      return IconName.Plant;
    case NotificationsActionsTypes.SNAPS:
      return IconName.SnapsMobile;
    case NotificationsActionsTypes.BRIDGED:
      return IconName.Bridge;
    case NotificationsActionsTypes.BOUGHT:
      return IconName.Card;
    default:
      return IconName.Sparkle;
  }
};

export function formatDate(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  }

  return date.toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  });
}

export function viewOnEtherscan(props: ViewOnEtherscanProps, state: any) {
  const {
    navigation,
    transactionObject: { networkID },
    transactionDetails: { transactionHash },
    providerConfig: { type },
    close,
  } = props;
  const { rpcBlockExplorer } = state;
  try {
    const { url, title } = getBlockExplorerTxUrl(
      type,
      transactionHash,
      rpcBlockExplorer,
    );
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: { url, title },
    });
    close?.();
  } catch (e) {
    // eslint-disable-next-line no-console
    Logger.error(e, {
      message: `can't get a block explorer link for network `,
      networkID,
    });
  }
}

export enum AvatarType {
  ADDRESS = 'address',
  ASSET = 'asset',
  NETWORK = 'network',
  TXSTATUS = 'txstatus',
}

export enum TxStatus {
  UNAPPROVED = 'unapproved',
  SUBMITTED = 'submitted',
  SIGNED = 'signed',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  APPROVED = 'approved',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export const returnAvatarProps = (status: TxStatus, theme: Theme) => {
  switch (status) {
    case TxStatus.CONFIRMED:
    case TxStatus.APPROVED:
      return {
        name: IconName.Check,
        backgroundColor: theme.colors.success.muted,
        iconColor: IconColor.Success,
      };
    case TxStatus.UNAPPROVED:
    case TxStatus.CANCELLED:
    case TxStatus.FAILED:
    case TxStatus.REJECTED:
      return {
        name: IconName.Close,
        backgroundColor: theme.colors.error.muted,
        iconColor: IconColor.Error,
      };
    case TxStatus.PENDING:
    case TxStatus.SUBMITTED:
    case TxStatus.SIGNED:
      return {
        name: IconName.Clock,
        backgroundColor: theme.colors.warning.muted,
        iconColor: IconColor.Warning,
      };
    default:
      return {
        name: IconName.Info,
        backgroundColor: theme.colors.background.alternative,
        iconColor: IconColor.Info,
      };
  }
};

export const networkFeeDetails = {
  'transactions.gas_limit': 'gas',
  'transactions.gas_used': 'gasUsed',
  'transactions.base_fee': 'estimatedBaseFee',
  'transactions.priority_fee': 'maxPriorityFeePerGas',
  'transactions.max_fee': 'maxPriorityFeePerGas',
};
