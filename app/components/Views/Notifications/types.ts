import type { Hex } from '@metamask/utils';
import type { NotificationsActionsTypes } from '../Settings/NotificationsSettings/NotificationsSettings.constants';
import NotificationTypes from '../../../util/notifications';
import { IconName } from '../../../component-library/components/Icons/Icon';

export interface Asset {
  address?: string;
  symbol?: string;
  ticker?: string;
  name?: string;
  logo?: string;
  isETH?: boolean;
  isNFT?: boolean;
  nftUri?: string;
}

export interface Transaction {
  id: string;
  chainId: Hex;
  from: string;
  to: string;
  data?: string;
  nonce: string;
  value?: string;
  type?: string;

  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedBaseFee?: string;
  estimateGasError?: string;

  time: string;
  status?: string;
  asset: Asset;
}

export interface Notification {
  id: string;
  isVisible: boolean;
  autodismiss: number;
  status: string;
  type: NotificationTypes;
  actionsType: NotificationsActionsTypes;
  imageUri?: string;
  title?: string;
  message?: string;
  cta?: {
    label: string;
    onPress: () => void;
    icon?: IconName;
  };
  data?: {
    transaction?: Transaction;
  };
  timestamp: string;
}
