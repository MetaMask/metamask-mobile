import {
  type ActivityKind,
  isPerpsOrderKind,
  PERPS_ORDER_KINDS,
} from './types';

const PERPS_PROVIDER_ACTIVITY_KINDS = new Set<ActivityKind>([
  ...PERPS_ORDER_KINDS,
  'perpsAddFunds',
  'perpsWithdraw',
  'perpsOpenLong',
  'perpsCloseLong',
  'perpsCloseLongLiquidated',
  'perpsCloseLongStopLoss',
  'perpsOpenShort',
  'perpsCloseShort',
  'perpsCloseShortLiquidated',
  'perpsCloseShortStopLoss',
  'perpsPaidFundingFees',
  'perpsReceivedFundingFees',
  'perpsCloseShortTakeProfit',
  'perpsCloseLongTakeProfit',
]);

export function isPerpsProviderActivityKind(kind: ActivityKind): boolean {
  return PERPS_PROVIDER_ACTIVITY_KINDS.has(kind) || isPerpsOrderKind(kind);
}
