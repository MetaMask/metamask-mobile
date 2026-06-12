import {
  ApprovalController,
  type ApprovalControllerMessenger,
} from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

import type { MessengerClientInitFunction } from '../types';
import { ApprovalTypes } from '../../RPCMethods/RPCMethodMiddleware';

export const approvalControllerInit: MessengerClientInitFunction<
  ApprovalController,
  ApprovalControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new ApprovalController({
    messenger: controllerMessenger,
    // Mobile drives approvals through state, so opening approval UI is handled elsewhere.
    showApprovalRequest: () => undefined,
    state: persistedState.ApprovalController,
    typesExcludedFromRateLimiting: [
      ApprovalType.Transaction,
      ApprovalType.WatchAsset,
      ApprovalTypes.SMART_TRANSACTION_STATUS,

      // Allow one flavor of snap_dialog to be queued.
      DIALOG_APPROVAL_TYPES.default,
    ],
  });

  return {
    controller,
  };
};
