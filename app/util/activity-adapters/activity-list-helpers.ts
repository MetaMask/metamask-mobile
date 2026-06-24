import type { CaipAssetType } from '@metamask/utils';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './adapters/environment';
import type { ActivityListItem } from './types';

const hidePlusSignActivityTypes = new Set<ActivityListItem['type']>([
  'approveSpendingCap',
  'increaseSpendingCap',
  'revokeSpendingCap',
]);

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
