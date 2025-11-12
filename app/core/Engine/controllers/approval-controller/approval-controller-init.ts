import {
  ApprovalController,
  ApprovalControllerMessenger,
} from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';

import Logger from '../../../../util/Logger';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';
import type { ControllerInitFunction } from '../../types';

export const ApprovalControllerInit: ControllerInitFunction<
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
      ],
    });

    return { controller: approvalController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize ApprovalController');
    throw error;
  }
};
