import { ApprovalController } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';

import Logger from '../../../../util/Logger';
import type { ControllerInitFunction } from '../../types';
import { type ApprovalControllerMessenger } from '../../messengers/approval-controller-messenger';

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
      ],
    });

    return { controller: approvalController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize ApprovalController');
    throw error;
  }
};
