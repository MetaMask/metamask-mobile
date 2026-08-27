/**
 * Activity adapters for MetaMask Mobile.
 * Core transaction mappers come from `@metamask/client-utils`; mobile-only
 * adapters (perps/predict/ramp) and UI helpers remain local until shared.
 */
export type {
  ActivityFee,
  ActivityListItem,
  ActivityKind,
  PerpsOrderKind,
  Status,
  TokenAmount,
} from './types';
export { PERPS_ORDER_KINDS, isPerpsOrderKind } from './types';
export {
  isNftTransferType,
  isUnlimitedApprovalAmount,
} from './adapters/helpers';
export {
  enrichLocalActivity,
  prepareLocalTransactionGroup,
} from './adapters/enrich-local-activity';
export { mapPredictActivity } from './adapters/predict-activity';
export { mapPerpsTransaction } from './adapters/perps-transaction';
export { mapRampOrder } from './adapters/ramp-order';
export { mapRampsOrder } from './adapters/ramps-order';
export {
  isRampFiatOrder,
  isRampRampsOrder,
} from './adapters/ramp-order-guards';
export { mobileActivityAdapterEnvironment } from './adapters/environment';
export type { TransactionGroup } from './adapters/transaction-group';
export { GAS_FEE_SPONSORED } from './fees';
export {
  getHumanReadableTokenAmount,
  getDisplaySignPrefix,
  applyDisplaySign,
  toMarketRateLookupToken,
} from './fiat';
export { formatTokenDisplayAmount } from './token-display';
export {
  enrichTokenFromApi,
  formatActivityListDateHeader,
  getActivityFromTo,
  getActivityValue,
  getGroupedActivityListItemKey,
  groupActivityListItems,
  isFailedOrCancelledTransfer,
  preferLocalOrApiActivityItem,
  shouldShowPlusSign,
  type GroupedActivityListItem,
} from './activity-list-helpers';
