import { useMemo } from 'react';
import { ApprovalTypes } from '../../../../../core/RPCMethods/RPCMethodMiddleware';
import { Alert, Severity } from '../../types/confirm';
import useApprovalRequest from '../useApprovalRequest';
import { RowAlertKey } from '../../components/UI/InfoRow/AlertRow/constants';
import { strings } from '../../../../../../locales/i18n';

export default function useConfirmationOriginAlerts(): Alert[] {
  const { approvalRequest } = useApprovalRequest();

  const alerts = useMemo(() => {
      if (approvalRequest?.type !== ApprovalTypes.ETH_SIGN_TYPED_DATA) {
          return [];
        }

        return  [
          {
            alertDetails: [strings('alerts.confirmation.origin_address_mismatch_warning.details')],
            key: RowAlertKey.Origin,
            field: RowAlertKey.Origin,
            isBlocking: false,
            message: strings('alerts.confirmation.origin_address_mismatch_warning.message'),
            severity: Severity.Danger,
          },
        ] as Alert[];
}, [approvalRequest]);

      return alerts;
}

