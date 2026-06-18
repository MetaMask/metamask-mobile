import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import type { WalletOptions } from '@metamask/wallet';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';

type ApprovalControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['approvalController']
>;

/**
 * Mobile drives approvals through state, so `showApprovalRequest` is omitted
 * here (the wallet defaults it to a no-op).
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
