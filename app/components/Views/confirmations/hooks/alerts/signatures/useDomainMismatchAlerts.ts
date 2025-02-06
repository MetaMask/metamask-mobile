import { useMemo } from 'react';
import {
  isValidSIWEOrigin,
  WrappedSIWERequest,
} from '@metamask/controller-utils';
import { Alert, Severity } from '../../../types/confirm';
import { RowAlertKey } from '../../../components/UI/InfoRow/AlertRow/constants';
import useApprovalRequest from '../../useApprovalRequest';
import { ApprovalTypes } from '../../../../../../core/RPCMethods/RPCMethodMiddleware';

export default function useDomainMismatchAlerts(): Alert[] {
  const { approvalRequest } = useApprovalRequest();

  // const { msgParams } = approvalRequest || {};
  // const isSIWE = Boolean(msgParams?.siwe?.isSIWEMessage);
  // const isInvalidSIWEDomain =
  //   isSIWE && !isValidSIWEOrigin(msgParams as WrappedSIWERequest);

  const alerts = useMemo(() => {
    // if (!isInvalidSIWEDomain) {
    //   return [];
    // }
          if (approvalRequest?.type !== ApprovalTypes.SIGN_MESSAGE) {
              return [];
            }

    return [
      {
        field: RowAlertKey.RequestFrom,
        key: 'requestFrom',
        message: 'alertMessageSignInDomainMismatch',
        reason: 'alertReasonSignIn',
        severity: Severity.Danger,
      },
    ] as Alert[];
  }, [approvalRequest]);

  return alerts;
}
