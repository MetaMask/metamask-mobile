import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localeData from 'dayjs/plugin/localeData';
import { Web3Provider } from '@ethersproject/providers';
import { toHex } from '@metamask/controller-utils';
import { IconName } from '@metamask/design-system-react-native';
import BigNumber from 'bignumber.js';
import {
  OnChainRawNotification,
  OnChainRawNotificationsWithNetworkFields,
  TRIGGER_TYPES,
  INotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  NOTIFICATION_CHAINS_ID,
  NOTIFICATION_NETWORK_CURRENCY_NAME,
  NOTIFICATION_NETWORK_CURRENCY_SYMBOL,
  SUPPORTED_NOTIFICATION_BLOCK_EXPLORERS,
} from '@metamask/notification-services-controller/notification-services/ui';
import Engine from '../../../core/Engine';
import { hexWEIToDecETH, hexWEIToDecGWEI } from '../../conversions';
import { calcTokenAmount } from '../../transactions';
import images from '../../../images/image-icons';
import I18n, { strings } from '../../../../locales/i18n';
import { ImageSourcePropType } from 'react-native';

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

// Extend dayjs with the plugins
dayjs.extend(localeData);
dayjs.extend(relativeTime);

function formatRelative(
  date: Dayjs,
  currentDate: Dayjs,
  locale: string = 'en',
): string {
  dayjs.locale(locale);
  if (date.from(currentDate) === 'a day ago') {
    return strings('notifications.yesterday');
  }
  return date.from(currentDate);
}

/**
 * Formats a given date into different formats based on how much time has elapsed since that date.
 *
 * @param date - The date to be formatted.
 * @returns The formatted date.
 */
export function formatMenuItemDate(date?: Date, locale: string = 'en'): string {
  if (!date) {
    return strings('notifications.no_date');
  }

  const currentDate = new Date();
  const currentDayjsDate = dayjs();
  const dayjsDate = dayjs(date);

  dayjs.locale(locale);

  // E.g. 12:21
  if (dayjsDate.isSame(currentDayjsDate, 'day')) {
    return dayjsDate.format('HH:mm');
  }

  // E.g. Yesterday
  if (isYesterday(currentDate, date)) {
    return formatRelative(dayjsDate, currentDayjsDate, I18n.locale);
  }

  // E.g. Oct 21
  if (dayjsDate.isSame(currentDayjsDate, 'year')) {
    return dayjsDate.format('MMM D');
  }

  // E.g. Oct 21, 2022
  return dayjsDate.format('MMM D, YYYY');
}

interface FormatOptions {
  decimalPlaces?: number;
  shouldEllipse?: boolean;
}
const defaultFormatOptions = {
  decimalPlaces: 4,
};

/**
 * Calculates the number of leading zeros in the fractional part of a number.
 *
 * This function converts a number or a string representation of a number into
 * its decimal form and then counts the number of leading zeros present in the
 * fractional part of the number. This is useful for determining the precision
 * of very small numbers.
 *
 * @param num - The number to analyze, which can be in the form
 * of a number or a string.
 * @returns The count of leading zeros in the fractional part of the number.
 */
export const getLeadingZeroCount = (num: number | string) => {
  const numToString = new BigNumber(num, 10).toString(10);
  const fractionalPart = numToString.split('.')[1] ?? '';
  return fractionalPart.match(/^0*/u)?.[0]?.length || 0;
};

/**
 * This formats a number using Intl
 * It abbreviates large numbers (using K, M, B, T)
 * And abbreviates small numbers in 2 ways:
 * - Will format to the given number of decimal places
 * - Will format up to 4 decimal places
 * - Will ellipse the number if longer than given decimal places
 *
 * @param numericAmount
 * @param opts
 * @returns
 */

export const formatAmount = (numericAmount: number, opts?: FormatOptions) => {
  // create options with defaults
  const options = { ...defaultFormatOptions, ...opts };

  const leadingZeros = getLeadingZeroCount(numericAmount);
  const isDecimal =
    numericAmount.toString().includes('.') ||
    leadingZeros > 0 ||
    numericAmount.toString().includes('e-');
  const isLargeNumber = numericAmount > 999;

  const handleShouldEllipse = (decimalPlaces: number) =>
    Boolean(options?.shouldEllipse) && leadingZeros >= decimalPlaces;

  if (isLargeNumber) {
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(numericAmount);
  }

  if (isDecimal) {
    const ellipse = handleShouldEllipse(options.decimalPlaces);
    const formattedValue = Intl.NumberFormat('en-US', {
      minimumFractionDigits: ellipse ? options.decimalPlaces : undefined,
      maximumFractionDigits: options.decimalPlaces,
    }).format(numericAmount);

    return ellipse ? `${formattedValue}...` : formattedValue;
  }

  // Default to showing the raw amount
  return numericAmount.toString();
};

function hasNetworkFeeFields(
  notification: OnChainRawNotification,
): notification is OnChainRawNotificationsWithNetworkFields {
  return 'network_fee' in notification.payload.data;
}

type HexChainId = `0x${string}`;

export function getProviderByChainId(chainId: HexChainId) {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(chainId);
  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  return provider && new Web3Provider(provider);
}

export const getNetworkFees = async (notification: OnChainRawNotification) => {
  if (!hasNetworkFeeFields(notification)) {
    throw new Error('Invalid notification type');
  }

  const chainId = toHex(notification.payload.chain_id);
  const provider = getProviderByChainId(chainId);

  if (!provider) {
    throw new Error(`No provider found for chainId ${chainId}`);
  }

  try {
    const [receipt, transaction, block] = await Promise.all([
      provider.getTransactionReceipt(notification.payload.tx_hash),
      provider.getTransaction(notification.payload.tx_hash),
      provider.getBlock(notification.payload.block_number),
    ]);

    const calculateUsdAmount = (value: string, decimalPlaces?: number) =>
      formatAmount(
        parseFloat(value) *
          parseFloat(
            notification.payload.data.network_fee.native_token_price_in_usd,
          ),
        {
          decimalPlaces: decimalPlaces || 4,
        },
      );

    const transactionFeeInEth = hexWEIToDecETH(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)._hex,
    )?.toString();
    const transactionFeeInUsd = calculateUsdAmount(transactionFeeInEth);

    const gasLimit = transaction.gasLimit.toNumber();
    const gasUsed = receipt.gasUsed.toNumber();

    const baseFee = block.baseFeePerGas
      ? hexWEIToDecGWEI(block.baseFeePerGas._hex)
      : null;
    const priorityFee = block.baseFeePerGas
      ? hexWEIToDecGWEI(receipt.effectiveGasPrice.sub(block.baseFeePerGas)._hex)
      : null;

    const maxFeePerGas = transaction.maxFeePerGas
      ? hexWEIToDecGWEI(transaction.maxFeePerGas._hex)
      : null;

    return {
      transactionFeeInEth,
      transactionFeeInUsd,
      gasLimit,
      gasUsed,
      baseFee,
      priorityFee,
      maxFeePerGas,
      chainId,
    };
  } catch (error) {
    throw new Error(
      `Error fetching network fees for chainId ${chainId}: ${error}`,
    );
  }
};

export const getNotificationBadge = (trigger_type: string): IconName => {
  switch (trigger_type) {
    case TRIGGER_TYPES.ERC20_SENT:
    case TRIGGER_TYPES.ERC721_SENT:
    case TRIGGER_TYPES.ERC1155_SENT:
    case TRIGGER_TYPES.ETH_SENT:
      return IconName.Arrow2UpRight;
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

// The character limit on ENS names, nicknames and addresses before we truncate
export const TRUNCATED_NAME_CHAR_LIMIT = 11;

// The number of characters to slice from the beginning of an address for truncated format:
// `${TRUNCATED_ADDRESS_START_CHARS}...${TRUNCATED_ADDRESS_END_CHARS}`
export const TRUNCATED_ADDRESS_START_CHARS = 7;

// The number of characters to slice from the end of an address for truncated format:
// `${TRUNCATED_ADDRESS_START_CHARS}...${TRUNCATED_ADDRESS_END_CHARS}`
export const TRUNCATED_ADDRESS_END_CHARS = 5;

/**
 * Shortens the given string, preserving the beginning and end.
 * Returns the string it is no longer than truncatedCharLimit.
 *
 * @param {string} stringToShorten - The string to shorten.
 * @param {object} options - The options to use when shortening the string.
 * @param {number} options.truncatedCharLimit - The maximum length of the string.
 * @param {number} options.truncatedStartChars - The number of characters to preserve at the beginning.
 * @param {number} options.truncatedEndChars - The number of characters to preserve at the end.
 * @returns {string} The shortened string.
 */
export function shortenString(
  stringToShorten = '',
  {
    truncatedCharLimit = TRUNCATED_NAME_CHAR_LIMIT,
    truncatedStartChars = TRUNCATED_ADDRESS_START_CHARS,
    truncatedEndChars = TRUNCATED_ADDRESS_END_CHARS,
    skipCharacterInEnd = false,
  }: {
    truncatedCharLimit?: number;
    truncatedStartChars?: number;
    truncatedEndChars?: number;
    skipCharacterInEnd?: boolean;
  } = {},
) {
  if (stringToShorten.length < truncatedCharLimit) {
    return stringToShorten;
  }

  return `${stringToShorten.slice(0, truncatedStartChars)}...${
    skipCharacterInEnd ? '' : stringToShorten.slice(-truncatedEndChars)
  }`;
}

export const sortNotifications = (
  notifications: INotification[],
): INotification[] => {
  if (!notifications) {
    return [];
  }

  // NOTE - sorting may be expensive due to re-creating Date obj.
  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

type KnownChainIds =
  | (typeof NOTIFICATION_CHAINS_ID)[keyof typeof NOTIFICATION_CHAINS_ID]
  | '8453';

const imageMap = {
  [NOTIFICATION_CHAINS_ID.ETHEREUM]: images.ETHEREUM,
  [NOTIFICATION_CHAINS_ID.LINEA]: images['LINEA-MAINNET'],
  [NOTIFICATION_CHAINS_ID.ARBITRUM]: images.AETH,
  [NOTIFICATION_CHAINS_ID.OPTIMISM]: images.OPTIMISM,
  [NOTIFICATION_CHAINS_ID.BSC]: images.BNB,
  [NOTIFICATION_CHAINS_ID.AVALANCHE]: images.AVAX,
  [NOTIFICATION_CHAINS_ID.POLYGON]: images.POL,
  [NOTIFICATION_CHAINS_ID.SEI]: images.SEI,
  '8453': images.BASE,
} satisfies Record<KnownChainIds, ImageSourcePropType | undefined>;

/**
 * Gets token information for the notification chains we support.
 * @param chainId Notification Chain Id. This is a subset of chains that support notifications
 * @returns native token details for a given chain
 */
export function getNativeTokenDetailsByChainId(chainId: number) {
  const chainIdString = chainId.toString();
  const knownChainIds: KnownChainIds[] = [
    ...Object.values(NOTIFICATION_CHAINS_ID),
    '8453',
  ];

  if (knownChainIds.includes(chainIdString as KnownChainIds)) {
    const knownChainId = chainIdString as KnownChainIds;
    const NAMES = { ...NOTIFICATION_NETWORK_CURRENCY_NAME, '8453': 'Base' };
    const SYMBOLS = { ...NOTIFICATION_NETWORK_CURRENCY_SYMBOL, '8453': 'ETH' };
    return {
      name: NAMES[knownChainId],
      symbol: SYMBOLS[knownChainId],
      image: imageMap[knownChainId],
    };
  }

  return undefined;
}

const isSupportedBlockExplorer = (
  chainId: string,
): chainId is keyof typeof SUPPORTED_NOTIFICATION_BLOCK_EXPLORERS =>
  chainId in SUPPORTED_NOTIFICATION_BLOCK_EXPLORERS;

/**
 * Gets block explorer information for the notification chains we support
 * @param chainId Notification Chain Id. This is a subset of chains that support notifications
 * @returns some default block explorers for the chains we support.
 */
export function getBlockExplorerByChainId(chainId: number) {
  const chainIdKey = String(chainId);
  if (isSupportedBlockExplorer(chainIdKey)) {
    return SUPPORTED_NOTIFICATION_BLOCK_EXPLORERS[chainIdKey].url;
  }

  return undefined;
}

/**
 * Converts a token amount from its smallest unit based on its decimals to a human-readable format,
 * applying formatting options such as decimal places and ellipsis for overflow.
 *
 * @param amount - The token amount in its smallest unit as a string.
 * @param decimals - The number of decimals the token uses.
 * @param options - Optional formatting options to specify the number of decimal places and whether to use ellipsis.
 * @returns The formatted token amount as a string. If the input is invalid, returns an empty string.
 */
export const getAmount = (
  amount: string,
  decimals: string,
  options?: FormatOptions,
) => {
  if (!amount || !decimals) {
    return '';
  }

  const numericAmount = calcTokenAmount(
    amount,
    parseFloat(decimals),
  ).toNumber();

  return formatAmount(numericAmount, options);
};

/**
 * Converts a token amount and its USD conversion rate to a formatted USD string.
 *
 * This function first converts the token amount from its smallest unit based on the provided decimals
 * to a human-readable format. It then multiplies this amount by the USD conversion rate to get the
 * equivalent amount in USD, and formats this USD amount into a readable string.
 *
 * @param amount - The token amount in its smallest unit as a string.
 * @param decimals - The number of decimals the token uses.
 * @param usd - The current USD conversion rate for the token.
 * @returns The formatted USD amount as a string. If any input is invalid, returns an empty string.
 */
export const getUsdAmount = (amount: string, decimals: string, usd: string) => {
  if (!amount || !decimals || !usd) {
    return '';
  }

  const amountInEther = calcTokenAmount(
    amount,
    parseFloat(decimals),
  ).toNumber();
  const numericAmount = parseFloat(`${amountInEther}`) * parseFloat(usd);

  return formatAmount(numericAmount);
};

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(strings('notifications.timeout'))), ms),
  );
  return Promise.race([promise, timeout]);
}
