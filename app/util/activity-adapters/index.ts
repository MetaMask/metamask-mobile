/**
 * Vendored Activity adapters from metamask-extension shared/lib/activity/
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */
export type {
  ActivityFee,
  ActivityListItem,
  ActivityKind,
  Status,
  TokenAmount,
} from './types';
export { mapApiEvmTransactions } from './adapters/api-evm-transactions';
export {
  isNftTransferType,
  isUnlimitedApprovalAmount,
} from './adapters/helpers';
export { mapKeyringTransaction } from './adapters/keyring-transaction';
export { mapLocalTransaction } from './adapters/local-transaction';
export { mapPredictActivity } from './adapters/predict-activity';
export { mapPerpsTransaction } from './adapters/perps-transaction';
export { mapRampOrder } from './adapters/ramp-order';
export {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './adapters/environment';
export type { TransactionGroup } from './adapters/transaction-group';
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
  isSpendingCapWithAmount,
  shouldShowPlusSign,
  type GroupedActivityListItem,
} from './activity-list-helpers';
