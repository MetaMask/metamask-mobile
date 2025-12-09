import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { strings } from '../../../../../../locales/i18n';
import useApprovalRequest from '../useApprovalRequest';
import { useOriginTrustSignals } from '../useOriginTrustSignals';
import { TrustSignalDisplayState } from '../../types/trustSignals';

export function useOriginTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();
  const signatureRequest = useSignatureRequest();
  const { approvalRequest } = useApprovalRequest();

  const origin = useMemo(() => {
    if (signatureRequest && approvalRequest?.requestData?.meta?.url) {
      return approvalRequest.requestData.meta.url;
    }
    if (transactionMetadata?.origin) {
      return transactionMetadata.origin;
    }
    if (approvalRequest?.requestData?.origin) {
      return approvalRequest.requestData.origin;
    }
    return undefined;
  }, [transactionMetadata, signatureRequest, approvalRequest]);

  const { state: trustSignalState } = useOriginTrustSignals(origin);

  return useMemo(() => {
    if (!origin) {
      return [];
    }

    const alerts: Alert[] = [];

    if (trustSignalState === TrustSignalDisplayState.Malicious) {
      alerts.push({
        key: AlertKeys.OriginTrustSignalMalicious,
        field: RowAlertKey.RequestFrom,
        severity: Severity.Danger,
        message: strings('alert_system.url_trust_signal.malicious.message'),
        title: strings('alert_system.url_trust_signal.malicious.title'),
        isBlocking: false,
      });
    } else if (trustSignalState === TrustSignalDisplayState.Warning) {
      alerts.push({
        key: AlertKeys.OriginTrustSignalWarning,
        field: RowAlertKey.RequestFrom,
        severity: Severity.Warning,
        message: strings('alert_system.url_trust_signal.warning.message'),
        title: strings('alert_system.url_trust_signal.warning.title'),
        isBlocking: false,
      });
    }

    return alerts;
  }, [origin, trustSignalState]);
}
