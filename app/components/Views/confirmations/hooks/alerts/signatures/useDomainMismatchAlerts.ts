import { useMemo } from 'react';
import { isValidSIWEOrigin, WrappedSIWERequest } from '@metamask/controller-utils';
import { RowAlertKey } from '../../../components/UI/InfoRow/AlertRow/constants';
import useApprovalRequest from '../../useApprovalRequest';
import { Alert, Severity } from '../../../types/alerts';
import { useSignatureRequest } from '../../useSignatureRequest';
import { isSIWESignatureRequest } from '../../../utils/signature';
import { strings } from '../../../../../../../locales/i18n';
import { regex } from '../../../../../../util/regex';
import { AlertKeys } from '../../../constants/alerts';

export default function useDomainMismatchAlerts(): Alert[] {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();

  const { requestData } = approvalRequest || {};
  const isSIWE = isSIWESignatureRequest(signatureRequest);

  const { meta } = requestData;

  const originWithProtocol = regex.urlHttpToHttps.test(requestData.origin) || !isSIWE ? requestData.origin : new URL(meta?.url).origin;

  const isInvalidSIWEDomain =
    isSIWE && !isValidSIWEOrigin({ ...requestData, origin: originWithProtocol } as WrappedSIWERequest);

  const alerts = useMemo(() => {
    if (!isInvalidSIWEDomain) {
      return [];
    }

    return [
      {
        field: RowAlertKey.RequestFrom,
        key: AlertKeys.DomainMismatch,
        message: strings('alert_system.domain_mismatch.message'),
        title: strings('alert_system.domain_mismatch.title'),
        severity: Severity.Danger,
      },
    ] as Alert[];
  }, [isInvalidSIWEDomain]);

  return alerts;
}
