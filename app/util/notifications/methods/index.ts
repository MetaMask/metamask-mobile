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
import { NotificationRowDetails, TxStatus } from './types';
import { NotificationServicesController } from '@metamask-previews/notification-services-controller';

const { UI } = NotificationServicesController;

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

export const sortNotifications = (
  notifications: Notification[],
): Notification[] => {
  if (!notifications) {
    return [];
  }

  // NOTE - sorting may be expensive due to re-creating Date obj.
  // TODO - see if this can be tidied.
  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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

/**
 * Checks if 2 date objects are on the same day
 *
 * @param currentDate
 * @param dateToCheck
 * @returns boolean if dates are same day.
 */
const isSameDay = (currentDate: Date, dateToCheck: Date) =>
  currentDate.getFullYear() === dateToCheck.getFullYear() &&
  currentDate.getMonth() === dateToCheck.getMonth() &&
  currentDate.getDate() === dateToCheck.getDate();

/**
 * Checks if a date is "yesterday" from the current date
 *
 * @param currentDate
 * @param dateToCheck
 * @returns boolean if dates were "yesterday"
 */
const isYesterday = (currentDate: Date, dateToCheck: Date) => {
  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);
  return isSameDay(yesterday, dateToCheck);
};

/**
 * Checks if 2 date objects are in the same year.
 *
 * @param currentDate
 * @param dateToCheck
 * @returns boolean if dates were in same year
 */
const isSameYear = (currentDate: Date, dateToCheck: Date) =>
  currentDate.getFullYear() === dateToCheck.getFullYear();

export function formatDate(createdAt: Date | string) {
  const date = new Date(createdAt);
  const currentDate = new Date();

  // E.g. 12:21
  if (isSameDay(currentDate, date)) {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).format(date);
  }

  // E.g. Yesterday
  if (isYesterday(currentDate, date)) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      -1,
      'day',
    );
  }

  // E.g. 21 Oct
  if (isSameYear(currentDate, date)) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  // E.g. 21 Oct 2022
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getNetwork(chain_id: number) {
  return ChainId[chain_id];
}

export const isNotificationsFeatureEnabled = () =>
  process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true';

// TODO - I don't this is a good way of formatting title (taking the trigger type as the title)
// If this is only for translations, sure. Otherwise we should not use this directly as title!
export function formatNotificationTitle(rawTitle: string): string {
  const words = rawTitle.split('_');
  words.shift();
  return words.join('_').toLowerCase();
}

function getNativeTokenDetailsByChainId(chainId: number) {
  const chainIdString = chainId.toString();
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.ETHEREUM) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.ETHEREUM,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.OPTIMISM) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.OPTIMISM,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.BSC) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.BNB,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.POLYGON) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.MATIC,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.ARBITRUM) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.AETH,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.AVALANCHE) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images.AVAX,
    };
  }
  if (chainIdString === UI.NOTIFICATION_CHAINS_ID.LINEA) {
    return {
      name: UI.NOTIFICATION_NETWORK_CURRENCY_NAME[chainIdString],
      symbol: UI.NOTIFICATION_NETWORK_CURRENCY_SYMBOL[chainIdString],
      image: images['LINEA-MAINNET'],
    };
  }

  return undefined;
}

export function getRowDetails(
  notification: Notification,
): NotificationRowDetails | null {
  switch (notification.type) {
    case TRIGGER_TYPES.LIDO_STAKE_COMPLETED:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED:
    case TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED:
    case TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED:
    case TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED:
      return {
        type: notification.type,
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
          },
        },
      };
    case TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN:
      return {
        type: notification.type,
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
          from: notification.address,
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
        type: notification.type,
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
          from: notification.address,
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
          },
        },
      };
    case TRIGGER_TYPES.ETH_SENT:
    case TRIGGER_TYPES.ETH_RECEIVED: {
      const tokenDetails = getNativeTokenDetailsByChainId(
        notification.chain_id,
      );
      if (!tokenDetails) {
        return null;
      }
      return {
        type: notification.type,
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
              symbol: tokenDetails.symbol,
              name: tokenDetails.name,
            },
          },
          value: `${notification.data.amount.eth} ${tokenDetails.symbol}`,
        },
        details: {
          type: notification.type,
          from: notification.data.from,
          to: notification.data.to,
          tx_hash: notification.tx_hash,
          status: notification.tx_hash
            ? TxStatus.CONFIRMED
            : TxStatus.UNAPPROVED,
          network: {
            name: getNetwork(notification.chain_id),
            image: tokenDetails.image,
          },
          networkFee: {
            gas_price: notification.data?.network_fee.gas_price,
            native_token_price_in_usd:
              notification.data?.network_fee.native_token_price_in_usd,
          },
          // TODO - USE DYNAMIC NATIVE TOKEN
          token: {
            name: tokenDetails.name,
            symbol: tokenDetails.symbol,
            image: tokenDetails.image,
            amount: notification.data.amount.eth,
            address: '0x0000000000000000000000000000000000000000',
          },
        },
      };
    }
    case TRIGGER_TYPES.ERC20_SENT:
    case TRIGGER_TYPES.ERC20_RECEIVED:
      return {
        type: notification.type,
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
          },
        },
      };
    case TRIGGER_TYPES.ERC721_SENT:
    case TRIGGER_TYPES.ERC721_RECEIVED:
    case TRIGGER_TYPES.ERC1155_SENT:
    case TRIGGER_TYPES.ERC1155_RECEIVED:
      return {
        type: notification.type,
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
          },
        },
      };
    case TRIGGER_TYPES.FEATURES_ANNOUNCEMENT:
      return {
        type: notification.type,
        row: {
          title: notification.data.title,
          description: notification.data.shortDescription,
          createdAt: formatDate(notification.createdAt),
          imageUrl: notification.data?.image.url,
        },
        details: {
          type: notification.type,
        },
      };
    default: {
      return null;
    }
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
  } catch (e) {
    if (e instanceof Error) {
      Logger.error(e, strings('notifications.error_checking_permission'));
    } else {
      Logger.error(
        new Error(strings('notifications.error_checking_permission')),
      );
    }
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

export * from './types';
