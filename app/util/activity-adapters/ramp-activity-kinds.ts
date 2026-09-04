import type { ActivityKind, ActivityListItem } from './types';

const RAMP_ACTIVITY_KINDS = new Set<ActivityKind>([
  'buy',
  'sell',
  'rampBuy',
  'rampSell',
]);

export function isRampActivityKind(kind: ActivityKind): boolean {
  return RAMP_ACTIVITY_KINDS.has(kind);
}

export function isRampActivityListRow(item: ActivityListItem): boolean {
  return isRampActivityKind(item.type) && 'from' in item.data;
}
