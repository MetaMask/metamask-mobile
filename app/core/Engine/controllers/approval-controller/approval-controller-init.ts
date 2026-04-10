import {
  ApprovalController,
  ApprovalControllerMessenger,
} from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

import Logger from '../../../../util/Logger';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';
import type { MessengerClientInitFunction } from '../../types';

export const ApprovalControllerInit: MessengerClientInitFunction<
  ApprovalController,
  ApprovalControllerMessenger
> = (request) => {
  const { controllerMessenger } = request;

  try {
    const approvalController = new ApprovalController({
      messenger: controllerMessenger,
      showApprovalRequest: () => undefined,
      typesExcludedFromRateLimiting: [
        ApprovalType.Transaction,
        ApprovalType.WatchAsset,
        ApprovalTypes.SMART_TRANSACTION_STATUS,
        DIALOG_APPROVAL_TYPES.default,
      ],
    });

    return { messengerClient: approvalController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize ApprovalController');
    throw error;
  }
};
