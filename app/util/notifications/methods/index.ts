import { Alert } from 'react-native';
import { utils as ethersUtils } from 'ethers';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { Theme } from '../../../util/theme/models';
import {
  ChainId,
  HalRawNotification,
  HalRawNotificationsWithNetworkFields,
  Notification,
  TRIGGER_TYPES,
  mmStorage,
} from '../../../util/notifications';
import { formatAmount } from '../../../components/UI/Ramp/utils';
import images from '../../../images/image-icons';
import { formatAddress } from '../../../util/address';
import { STORAGE_IDS } from '../settings/storage/constants';
import Device from '../../../util/device';
import { renderFromWei } from '../../../util/number';
import Engine from '../../../core/Engine';
import { query } from '@metamask/controller-utils';

export interface ViewOnEtherscanProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export interface NotificationRowProps {
  row: {
    title: string;
    createdAt: string;

    badgeIcon?: IconName;
    imageUrl?: string;
    description?: {
      asset?: {
        symbol?: string;
        name?: string;
      };
      text?: string;
    };
    value: string;
  };
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
}

export const sortNotifications = (
  notifications: Notification[],
): Notification[] => {
  if (!notifications) {
    return [];
  }
  return notifications.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
};

export const getNotificationBadge = (trigger_type: string) => {
  switch (trigger_type) {
    case TRIGGER_TYPES.ERC20_SENT:
    case TRIGGER_TYPES.ERC721_SENT:
    case TRIGGER_TYPES.ERC1155_SENT:
    case TRIGGER_TYPES.ETH_SENT:
      return IconName.Arrow2Upright;
    case TRIGGER_TYPES.ERC20_RECEIVED:
    case TRIGGER_TYPES.ERC721_RECEIVED:
    case TRIGGER_TYPES.ERC1155_RECEIVED:
    case TRIGGER_TYPES.ETH_RECEIVED:
      return IconName.Received;
    case TRIGGER_TYPES.METAMASK_SWAP_COMPLETED:
      return IconName.SwapHorizontal;
    case TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED:
    case TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED:
    case TRIGGER_TYPES.LIDO_STAKE_COMPLETED:
    case TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED:
      return IconName.Plant;
    default:
      return IconName.Sparkle;
  }
};

export function formatDate(createdAt: Date) {
  const now = new Date();
  const date = createdAt;

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
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const month = strings(`date.months.${date.getMonth()}`);
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('default', options);
  }

  return `${month} ${day}`;
}

export function getNetwork(chain_id: HalRawNotification['chain_id']) {
  return ChainId[chain_id];
}

export const isNotificationsFeatureEnabled = () =>
  process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true';

export function formatNotificationTitle(rawTitle: string): string {
  const words = rawTitle.split('_');
  words.shift();
  return words.join('_').toLowerCase();
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

export function getRowDetails(
  notification: Notification,
): NotificationRowProps {
  switch (notification.type) {
    case TRIGGER_TYPES.LIDO_STAKE_COMPLETED:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED:
    case TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED:
    case TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          title: strings(
            `notifications.${formatNotificationTitle(notification.type)}`,
          ),
          description: {
            asset: {
              symbol: notification.data.stake_out.symbol,
              name: notification.data.stake_out.name,
            },
          },
          createdAt: formatDate(notification.createdAt),
          imageUrl:
            notification.data.stake_out?.image ||
            notification.data.stake_in?.image, //using the stake_in image as a fallback,
          value: `${renderFromWei(notification.data.stake_out.amount)} ${
            notification.data.stake_out.symbol
          }`,
        },
        details: {
          type: notification.type,
          stake_in: notification.data.stake_in,
          stake_out: notification.data.stake_out,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image:
              notification.data.stake_out?.image ||
              notification.data.stake_in?.image, //using the stake_in image as a fallback,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
            details: {},
          },
        },
      };
    case TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          title: strings(
            `notifications.${formatNotificationTitle(notification.type)}`,
          ),
          description: {
            asset: {
              symbol: notification.data.staked_eth.symbol,
              name: notification.data.staked_eth.name,
            },
          },
          createdAt: formatDate(notification.createdAt),
          imageUrl: notification.data.staked_eth.image,
          value: `${notification.data.staked_eth.amount} ${notification.data.staked_eth.symbol}`,
        },
        details: {
          type: notification.type,
          request_id: notification.data.request_id,
          staked_eth: notification.data.staked_eth,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image: notification.data.staked_eth.image,
          },
        },
      };
    case TRIGGER_TYPES.METAMASK_SWAP_COMPLETED:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          title: strings('notifications.swap_completed', {
            from: notification.data.token_in.symbol,
            to: notification.data.token_out.symbol,
          }),
          description: {
            asset: {
              symbol: notification.data.token_out.symbol,
              name: notification.data.token_out.name,
            },
          },
          createdAt: formatDate(notification.createdAt),
          imageUrl:
            notification.data.token_out.image ||
            notification.data.token_in.image, //using the token_in image as a fallback,
          value: `${renderFromWei(notification.data.token_out.amount)} ${
            notification.data.token_out.symbol
          }`,
        },
        details: {
          type: notification.type,
          rate: notification.data.rate,
          token_in: notification.data.token_in,
          token_out: notification.data.token_out,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image: notification.data.token_in.image,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
            details: {},
          },
        },
      };
    case TRIGGER_TYPES.ETH_SENT:
    case TRIGGER_TYPES.ETH_RECEIVED:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          createdAt: formatDate(notification.createdAt),
          title: strings(
            `notifications.${formatNotificationTitle(notification.type)}`,
            {
              address: formatAddress(
                notification.type.includes('sent')
                  ? notification.data.to
                  : notification.data.from,
                'short',
              ),
            },
          ),
          description: {
            asset: {
              symbol: 'ETH',
              name: 'Ethereum',
            },
          },
          value: `${notification.data.amount.eth} ETH`,
        },
        details: {
          type: notification.type,
          amount: notification.data.amount,
          from: notification.data.from,
          to: notification.data.to,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image: images.ETHEREUM,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
            details: {},
          },
          token: {
            name: 'Ethereum',
            symbol: 'ETH',
            image: images.ETHEREUM,
            amount: notification.data.amount.eth,
            address: '0xdb24b8170fc863c77f50a2b25297f642c5fe5010',
          },
        },
      };
    case TRIGGER_TYPES.ERC20_SENT:
    case TRIGGER_TYPES.ERC20_RECEIVED:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          title: strings(
            `notifications.${formatNotificationTitle(notification.type)}`,
            {
              address: formatAddress(
                notification.data.kind.includes('sent')
                  ? notification.data.to
                  : notification.data.from,
                'short',
              ),
            },
          ),
          description: {
            asset: {
              symbol: notification.data.token.symbol,
              name: notification.data.token.name,
            },
          },
          createdAt: formatDate(notification.createdAt),
          imageUrl: notification.data.token.image,
          value: `${renderFromWei(notification.data.token.amount)} ${
            notification.data.token.symbol
          }`,
        },
        details: {
          type: notification.type,
          token: notification.data.token,
          from: notification.data.from,
          to: notification.data.to,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image: notification.data.token.image,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
            details: {},
          },
        },
      };
    case TRIGGER_TYPES.ERC721_SENT:
    case TRIGGER_TYPES.ERC721_RECEIVED:
    case TRIGGER_TYPES.ERC1155_SENT:
    case TRIGGER_TYPES.ERC1155_RECEIVED:
      return {
        row: {
          badgeIcon: getNotificationBadge(notification.type),
          title: strings(`notifications.${notification.type}`, {
            address: formatAddress(
              notification.type.includes('sent')
                ? notification.data.to
                : notification.data.from,
              'short',
            ),
          }),
          description: {
            asset: {
              symbol: notification.data?.nft?.collection.symbol,
              name: notification.data?.nft?.collection.name,
            },
          },
          createdAt: formatDate(notification.createdAt),
          imageUrl: notification.data?.nft?.image,
          value: `#${notification.data?.nft?.token_id}`,
        },
        details: {
          type: notification.type,
          nft: {
            name: notification.data?.nft?.name,
            image: notification.data?.nft?.image,
          },
          from: notification.data.from,
          to: notification.data.to,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          collection: notification.data?.nft?.collection,
          network: {
            name: getNetwork(notification.chain_id),
            image: notification.data.nft?.image,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
            details: {},
          },
        },
      };

    default:
      return {
        row: {
          title: notification.data.title,
          description: { text: notification.data.shortDescription },
          createdAt: formatDate(notification.createdAt),
          value: '',
        },
        details: {},
      };
  }
}

export enum AvatarType {
  ADDRESS = 'address',
  ASSET = 'asset',
  NETWORK = 'network',
  TXSTATUS = 'txstatus',
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

export const notificationSettings = {
  assetsReceived: false,
  assetsSent: false,
  deFi: false,
  productAnnouncements: false,
  snaps: false,
};

export const requestPushNotificationsPermission = async () => {
  let permissionStatus;

  const promptCount = mmStorage.getLocal(
    STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
  );

  try {
    permissionStatus = await notifee.requestPermission();

    if (permissionStatus.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      const times = promptCount + 1 || 1;

      Alert.alert(
        strings('notifications.prompt_title'),
        strings('notifications.prompt_desc'),
        [
          {
            text: strings('notifications.prompt_cancel'),
            onPress: () => {
              mmStorage.saveLocal(
                STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
                times,
              );
              mmStorage.saveLocal(
                STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_TIME,
                Date.now().toString(),
              );
            },
            style: 'default',
          },
          {
            text: strings('notifications.prompt_ok'),
            onPress: async () => {
              if (Device.isIos()) {
                permissionStatus = await notifee.requestPermission({
                  provisional: true,
                });
              } else {
                permissionStatus = await notifee.requestPermission();
              }
            },
          },
        ],
        { cancelable: false },
      );
    }

    return permissionStatus;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    Logger.error(e, strings('notifications.error_checking_permission'));
  }
};

function hasNetworkFeeFields(
  notification: HalRawNotification,
): notification is HalRawNotificationsWithNetworkFields {
  return 'network_fee' in notification.data;
}

async function fetchTxDetails(tx_hash: string) {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { TransactionController } = Engine.context as any;

  try {
    const receipt = await query(
      TransactionController.ethQuery,
      'getTransactionReceipt',
      [tx_hash],
    );

    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    const block = await query(
      TransactionController.ethQuery,
      'getBlockByHash',
      [receipt.blockHash, false],
    );

    if (!block) {
      throw new Error('Transaction block not found');
    }

    const transaction = await query(
      TransactionController.ethQuery,
      'eth_getTransactionByHash',
      [receipt.blockHash],
    );

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return {
      receipt,
      transaction,
      block,
    };
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
}

export const getNetworkFees = async (notification: HalRawNotification) => {
  if (!hasNetworkFeeFields(notification)) {
    throw new Error('Invalid notification type');
  }

  try {
    const { receipt, transaction, block } = await fetchTxDetails(
      notification.tx_hash,
    );
    const calculateUsdAmount = (value: string, decimalPlaces = 4) =>
      formatAmount(
        (parseFloat(value) *
          parseFloat(
            notification.data?.network_fee.native_token_price_in_usd,
          )) /
          decimalPlaces,
      );

    const transactionFeeInEth = ethersUtils.formatUnits(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)._hex,
    );
    const transactionFeeInUsd = calculateUsdAmount(transactionFeeInEth);

    const gasLimit = transaction.gasLimit.toNumber();
    const gasUsed = receipt.gasUsed.toNumber();

    const baseFee = block.baseFeePerGas
      ? ethersUtils.formatUnits(block.baseFeePerGas._hex, 'gwei')
      : null;
    const priorityFee = block.baseFeePerGas
      ? ethersUtils.formatUnits(
          receipt.effectiveGasPrice.sub(block.baseFeePerGas)._hex,
          'gwei',
        )
      : null;

    const maxFeePerGas = transaction.maxFeePerGas
      ? ethersUtils.formatUnits(transaction.maxFeePerGas._hex, 'gwei')
      : null;

    return {
      transactionFeeInEth,
      transactionFeeInUsd,
      gasLimit,
      gasUsed,
      baseFee,
      priorityFee,
      maxFeePerGas,
    };
  } catch (error) {
    console.error(
      `Failed to get transaction network fees for ${notification.tx_hash}`,
      error,
    );
    throw error;
  }
};
