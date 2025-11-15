import { useSelector } from 'react-redux';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';
import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useIsTransactionPayLoading } from '../pay/useIsTransactionPayLoading';

export function useNoPayTokenQuotesAlert() {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const { payToken } = useTransactionPayToken();
  const { isLoading } = useIsTransactionPayLoading();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const showAlert = payToken && !isLoading && quotes === undefined;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.no_pay_token_quotes.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [showAlert]);
}
