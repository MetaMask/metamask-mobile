import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import type { WalletOptions } from '@metamask/wallet';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';

type ApprovalControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['approvalController']
>;

/**
 * Mobile drives approvals through state, so `showApprovalRequest` is omitted
 * here (the wallet defaults it to a no-op). `typesExcludedFromRateLimiting`
 * lists the approval types allowed to bypass the per-origin rate limit
 * (transactions, watch-asset, smart-transaction status, and one queued
 * `snap_dialog`).
 *
 * @returns The mobile ApprovalController instance options.
 */
export function getApprovalControllerInstanceOptions(): ApprovalControllerInstanceOptions {
  return {
    typesExcludedFromRateLimiting: [
      ApprovalType.Transaction,
      ApprovalType.WatchAsset,
      ApprovalTypes.SMART_TRANSACTION_STATUS,

      // Allow one flavor of snap_dialog to be queued.
      DIALOG_APPROVAL_TYPES.default,
    ],
  };
}
