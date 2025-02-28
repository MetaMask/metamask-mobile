import { useMemo } from 'react';
import { isValidSIWEOrigin } from '@metamask/controller-utils';
import { RowAlertKey } from '../../../components/UI/InfoRow/AlertRow/constants';
import useApprovalRequest from '../../useApprovalRequest';
import { Alert, Severity } from '../../../types/alerts';
import { useSignatureRequest } from '../../useSignatureRequest';
import { isSIWESignatureRequest } from '../../../utils/signature';
import { strings } from '../../../../../../../locales/i18n';

export default function useDomainMismatchAlerts(): Alert[] {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();

  const { requestData } = approvalRequest || {};
  const isSIWE = isSIWESignatureRequest(signatureRequest);

  const isInvalidSIWEDomain =
    isSIWE && !isValidSIWEOrigin(requestData);

  const alerts = useMemo(() => {
    if (!isInvalidSIWEDomain) {
      return [];
    }

    return [
      {
        field: RowAlertKey.RequestFrom,
        key: RowAlertKey.RequestFrom,
        message: strings('alert_system.domain_mismatch_alert.message'),
        title: strings('alert_system.domain_mismatch_alert.title'),
        severity: Severity.Danger,
      },
    ] as Alert[];
  }, [isInvalidSIWEDomain]);

  return alerts;
}
