import type { CaipAssetType } from '@metamask/utils';
import { strings } from '../../../locales/i18n';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './adapters/environment';
import type { ActivityListItem, TokenAmount } from './types';

export const SPENDING_CAP_KINDS = new Set<ActivityListItem['type']>([
  'approveSpendingCap',
  'increaseSpendingCap',
  'revokeSpendingCap',
  'assetActivation',
  'assetDeactivation',
]);

const hidePlusSignActivityTypes = SPENDING_CAP_KINDS;

/**
 * True when a spending-cap item carries a cap amount — an explicit `amount` or
 * an unlimited approval.
 */
export function isSpendingCapWithAmount(item: ActivityListItem): boolean {
  if (!SPENDING_CAP_KINDS.has(item.type)) {
    return false;
  }
  const token = 'token' in item.data ? item.data.token : undefined;
  return Boolean(token?.amount || token?.isUnlimitedApproval);
}

/**
 * True when fee.amount is a non-zero integer (decimal or hex). Empty / invalid
 * strings are treated as no amount.
 */
function hasNonZeroFeeAmount(amount: string | undefined): boolean {
  if (!amount) {
    return false;
  }
  try {
    return BigInt(amount) > 0n;
  } catch {
    return false;
  }
}

/**
 * True when the item has a gas-token fee (ERC-20 gas payment) with a non-zero
 * amount. Used to prefer local Activity rows over confirmed API copies that
 * only have a native network fee (TMCU-1064).
 */
export function isGasTokenFeeWithAmount(item: ActivityListItem): boolean {
  if (!('fees' in item.data) || !item.data.fees?.length) {
    return false;
  }
  return item.data.fees.some(
    (fee) => fee.type === 'gasToken' && hasNonZeroFeeAmount(fee.amount),
  );
}

/**
 * Whether a local Activity row should win over a same-hash API/confirmed copy.
 * Shared by the Activity list dedup and Activity Details resolution so the
 * gas-token / spending-cap / out-categorize rules stay aligned (TMCU-1064).
 *
 * Gas-token preference requires matching types so a degraded local
 * `contractInteraction` cannot permanently beat a richer API `send`/`swap`.
 */
export function shouldPreferLocalActivityItem(
  localItem: ActivityListItem,
  apiItem: ActivityListItem,
): boolean {
  const localOutCategorizesApi =
    apiItem.type !== localItem.type &&
    localItem.type !== 'contractInteraction' &&
    localItem.type !== 'swapIncomplete';

  const localHasRicherSpendingCap =
    apiItem.type === localItem.type &&
    isSpendingCapWithAmount(localItem) &&
    !isSpendingCapWithAmount(apiItem);

  const localHasGasTokenFee =
    apiItem.type === localItem.type &&
    isGasTokenFeeWithAmount(localItem) &&
    !isGasTokenFeeWithAmount(apiItem);

  return (
    localOutCategorizesApi || localHasRicherSpendingCap || localHasGasTokenFee
  );
}

/**
 * Picks local vs API Activity for Details (and list-aligned resolution).
 */
export function preferLocalOrApiActivityItem(
  localItem: ActivityListItem,
  apiItem: ActivityListItem | undefined,
): ActivityListItem {
  if (!apiItem) {
    return localItem;
  }
  return shouldPreferLocalActivityItem(localItem, apiItem)
    ? localItem
    : apiItem;
}

export type ActivityListFilter =
  | { assetId: CaipAssetType }
  | { networks: string[] };

export type GroupedActivityListItem =
  | { type: 'pending-header' }
  | { type: 'date-header'; date: number }
  | { type: 'item'; item: ActivityListItem };

export function shouldShowPlusSign(activityType: ActivityListItem['type']) {
  return !hidePlusSignActivityTypes.has(activityType);
}

/**
 * A send/receive that failed or was cancelled moved no tokens, so its transfer
 * amount (surfaced from the attempted/original transaction) is misleading. The
 * row, the details amount header, and the details total all suppress it via this
 * predicate so they stay consistent.
 */
export function isFailedOrCancelledTransfer(item: ActivityListItem): boolean {
  return (
    (item.status === 'failed' || item.status === 'cancelled') &&
    (item.type === 'send' || item.type === 'receive')
  );
}

export const isSameLocalDay = (date: Date, otherDate: Date) =>
  date.getFullYear() === otherDate.getFullYear() &&
  date.getMonth() === otherDate.getMonth() &&
  date.getDate() === otherDate.getDate();

export const formatActivityListDateHeader = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) {
    return strings('perps.today');
  }

  if (isSameLocalDay(date, yesterday)) {
    return strings('perps.yesterday');
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getTokenActivityValue = (token: TokenAmount) => {
  const amount = token.isUnlimitedApproval
    ? strings('confirm.unlimited')
    : (token.amount ?? '');

  return `${amount} ${token.symbol}`.trim();
};

export const getActivityValue = (item: ActivityListItem) => {
  const { data } = item;

  if ('token' in data && data.token?.symbol) {
    return getTokenActivityValue(data.token);
  }

  if ('destinationToken' in data && data.destinationToken?.symbol) {
    return getTokenActivityValue(data.destinationToken);
  }

  if ('sourceToken' in data && data.sourceToken?.symbol) {
    return getTokenActivityValue(data.sourceToken);
  }

  return undefined;
};

export function enrichTokenFromApi(
  token: TokenAmount | undefined,
  dataByAssetId: Record<string, { symbol?: string; decimals?: number }>,
): TokenAmount | undefined {
  if (!token?.assetId) {
    return token;
  }
  const listToken = dataByAssetId[token.assetId.toLowerCase()];
  if (!listToken) {
    return token;
  }
  const symbol = token.symbol ?? listToken.symbol;
  const decimals = token.decimals ?? listToken.decimals;
  return {
    ...token,
    ...(symbol ? { symbol } : {}),
    ...(decimals === undefined ? {} : { decimals }),
  };
}

export const getActivityFromTo = (item: ActivityListItem) => {
  const { data } = item;
  const rawFrom = (() => {
    if (item.raw?.type === 'apiEvmTransaction') {
      return item.raw.data.from;
    }

    if (item.raw?.type === 'localTransaction') {
      return item.raw.data.initialTransaction.txParams.from;
    }

    if (item.raw?.type === 'keyringTransaction') {
      return item.raw.data.from[0]?.address;
    }

    return undefined;
  })();

  const rawTo = (() => {
    if (item.raw?.type === 'apiEvmTransaction') {
      return item.raw.data.to;
    }

    if (item.raw?.type === 'localTransaction') {
      return item.raw.data.initialTransaction.txParams.to;
    }

    if (item.raw?.type === 'keyringTransaction') {
      return item.raw.data.to[0]?.address;
    }

    return undefined;
  })();

  return {
    from:
      'from' in data && typeof data.from === 'string'
        ? data.from
        : (rawFrom ?? ''),
    to: 'to' in data && typeof data.to === 'string' ? data.to : (rawTo ?? ''),
  };
};

export const getGroupedActivityListItemKey = (
  item: GroupedActivityListItem,
  index: number,
) => {
  if (item.type === 'pending-header') {
    return 'pending-header';
  }

  if (item.type === 'date-header') {
    return `date-header-${item.date}`;
  }

  const raw = item.item.raw;
  const { chainId } = item.item;
  if (raw?.type === 'localTransaction') {
    const txId =
      raw.data.primaryTransaction?.id ?? raw.data.initialTransaction?.id;
    if (txId) {
      return `local-transaction-${chainId}-${txId}`;
    }
  }

  if (raw?.type === 'keyringTransaction' && raw.data.id) {
    return `keyring-transaction-${chainId}-${raw.data.id}`;
  }

  if (raw?.type === 'apiEvmTransaction' && item.item.hash) {
    return `api-evm-transaction-${chainId}-${item.item.hash}`;
  }

  if (item.item.hash) {
    return `${chainId}-${item.item.type}-${item.item.hash}`;
  }

  return `${chainId}-${item.item.type}-${item.item.timestamp}-${index}`;
};

export function activityMatchesAssetId(
  item: ActivityListItem,
  assetId: CaipAssetType,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
) {
  const { data } = item;
  const tokenAssetIds = [
    'token' in data ? data.token?.assetId : undefined,
    'sourceToken' in data ? data.sourceToken?.assetId : undefined,
    'destinationToken' in data ? data.destinationToken?.assetId : undefined,
  ];

  return tokenAssetIds.some(
    (tokenAssetId) =>
      tokenAssetId !== undefined &&
      environment.equalsIgnoreCase(tokenAssetId, assetId),
  );
}

function parseDate(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function groupItemsByDate(
  items: ActivityListItem[],
): GroupedActivityListItem[] {
  let currentDate: number | null = null;

  return items.flatMap((item): GroupedActivityListItem[] => {
    const date = parseDate(item.timestamp);

    if (date === currentDate) {
      return [{ type: 'item', item }];
    }

    currentDate = date;
    return [
      { type: 'date-header', date },
      { type: 'item', item },
    ];
  });
}

export function groupActivityListItems(
  items: ActivityListItem[],
): GroupedActivityListItem[] {
  const pending: ActivityListItem[] = [];
  const historical: ActivityListItem[] = [];

  for (const item of items) {
    if (item.status === 'pending') {
      pending.push(item);
    } else {
      historical.push(item);
    }
  }

  const grouped: GroupedActivityListItem[] = [];

  if (pending.length > 0) {
    grouped.push({ type: 'pending-header' });
    for (const item of pending) {
      grouped.push({ type: 'item', item });
    }
  }

  grouped.push(...groupItemsByDate(historical));
  return grouped;
}
