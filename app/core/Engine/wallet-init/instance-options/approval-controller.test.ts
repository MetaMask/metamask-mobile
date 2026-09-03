import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import { getApprovalControllerInstanceOptions } from './approval-controller';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';

describe('getApprovalControllerInstanceOptions', () => {
  it('excludes the expected approval types from rate limiting', () => {
    const options = getApprovalControllerInstanceOptions();

    expect(options.typesExcludedFromRateLimiting).toEqual([
      ApprovalType.Transaction,
      ApprovalType.WatchAsset,
      ApprovalTypes.SMART_TRANSACTION_STATUS,
      DIALOG_APPROVAL_TYPES.default,
    ]);
  });
});
