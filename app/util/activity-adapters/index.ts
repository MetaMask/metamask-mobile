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
export { enrichKeyringActivityWithBridge } from './adapters/enrich-keyring-activity';
export { mapLocalTransaction } from './adapters/local-transaction';
export { mapPredictActivity } from './adapters/predict-activity';
export { mapPerpsTransaction } from './adapters/perps-transaction';
export { mapRampOrder } from './adapters/ramp-order';
export { mapRampsOrder } from './adapters/ramps-order';
export {
  isRampFiatOrder,
  isRampRampsOrder,
} from './adapters/ramp-order-guards';
export {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './adapters/environment';
export type { TransactionGroup } from './adapters/transaction-group';
export { GAS_FEE_SPONSORED } from './fees';
export { getLabelKeys } from './label-keys';
export {
  calculateFiatFromMarketRates,
  getHumanReadableTokenAmount,
  formatTokenQuantity,
  getDisplaySignPrefix,
  applyDisplaySign,
  toMarketRateLookupToken,
} from './fiat';
export {
  activityMatchesAssetId,
  enrichTokenFromApi,
  formatActivityListDateHeader,
  getActivityFromTo,
  getActivityValue,
  getGroupedActivityListItemKey,
  groupActivityListItems,
  isFailedOrCancelledTransfer,
  isGasTokenFeeWithAmount,
  isSpendingCapWithAmount,
  preferLocalOrApiActivityItem,
  shouldPreferLocalActivityItem,
  shouldShowPlusSign,
  type GroupedActivityListItem,
} from './activity-list-helpers';
