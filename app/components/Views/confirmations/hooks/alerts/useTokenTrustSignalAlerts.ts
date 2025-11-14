import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectTokenScanResult } from '../../../../../selectors/phishingController';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';

export function useTokenTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();

  const incomingToken =
    transactionMetadata?.simulationData?.tokenBalanceChanges?.find(
      (change) => !change.isDecrease,
    );

  const tokenAddress = incomingToken?.address || '';
  const chainId = transactionMetadata?.chainId || '';

  const tokenScanResult = useSelector((state: RootState) =>
    selectTokenScanResult(state, { tokenAddress, chainId }),
  );

  const alertSeverity = useMemo(() => {
    if (!tokenScanResult) {
      return null;
    }

    const resultType = tokenScanResult.result_type;

    if (resultType === 'Malicious') {
      return Severity.Danger;
    }

    if (resultType === 'Warning') {
      return Severity.Warning;
    }

    return null;
  }, [tokenScanResult]);

  const alerts = useMemo(() => {
    if (!alertSeverity) {
      return [];
    }

    const isDanger = alertSeverity === Severity.Danger;

    const alertKey = isDanger
      ? AlertKeys.TokenTrustSignalMalicious
      : AlertKeys.TokenTrustSignalWarning;

    const message = isDanger
      ? strings('alert_system.token_trust_signal.malicious.message')
      : strings('alert_system.token_trust_signal.warning.message');

    const title = isDanger
      ? strings('alert_system.token_trust_signal.malicious.title')
      : strings('alert_system.token_trust_signal.warning.title');

    return [
      {
        key: alertKey,
        field: RowAlertKey.IncomingTokens,
        message,
        title,
        severity: alertSeverity,
        isBlocking: false,
      },
    ];
  }, [alertSeverity]);

  return alerts;
}
