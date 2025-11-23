import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { selectUrlScanResult } from '../../../../../selectors/phishingController';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import useApprovalRequest from '../useApprovalRequest';
import { RecommendedAction } from '@metamask/phishing-controller';

export function useUrlTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();
  const signatureRequest = useSignatureRequest();
  const { approvalRequest } = useApprovalRequest();

  const urlToScan = useMemo(() => {
    // For signatures, use the URL from approval request meta
    if (signatureRequest && approvalRequest?.requestData?.meta?.url) {
      return approvalRequest.requestData.meta.url;
    }

    // For transactions, use the origin
    if (transactionMetadata?.origin) {
      return transactionMetadata.origin;
    }

    // Fallback to approval request origin
    if (approvalRequest?.requestData?.origin) {
      return approvalRequest.requestData.origin;
    }

    return undefined;
  }, [transactionMetadata, signatureRequest, approvalRequest]);

  const urlScanResult = useSelector((state: RootState) =>
    selectUrlScanResult(state, { url: urlToScan }),
  );

  const alerts = useMemo(() => {
    if (!urlScanResult?.scanResult) {
      return [];
    }

    const resultType = urlScanResult.scanResult.recommendedAction;
    let severity: Severity | null = null;

    if (resultType === RecommendedAction.Block) {
      severity = Severity.Danger;
    } else if (resultType === RecommendedAction.Warn) {
      severity = Severity.Warning;
    }

    if (!severity) {
      return [];
    }

    const isDanger = severity === Severity.Danger;

    const alertKey = isDanger
      ? AlertKeys.UrlTrustSignalMalicious
      : AlertKeys.UrlTrustSignalWarning;

    const message = isDanger
      ? strings('alert_system.url_trust_signal.malicious.message')
      : strings('alert_system.url_trust_signal.warning.message');

    const title = isDanger
      ? strings('alert_system.url_trust_signal.malicious.title')
      : strings('alert_system.url_trust_signal.warning.title');

    return [
      {
        key: alertKey,
        field: RowAlertKey.RequestFrom,
        message,
        title,
        severity,
        isBlocking: false,
      },
    ];
  }, [urlScanResult]);

  // eslint-disable-next-line no-console
  console.log('alerts', alerts);
  // eslint-disable-next-line no-console
  console.log('urlScanResult', urlScanResult);
  // eslint-disable-next-line no-console
  console.log('urlToScan', urlToScan);

  return alerts;
}
