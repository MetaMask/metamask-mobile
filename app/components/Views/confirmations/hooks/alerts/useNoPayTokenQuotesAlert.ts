import { useSelector } from 'react-redux';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';
import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';

export function useNoPayTokenQuotesAlert() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { payToken } = useTransactionPayToken();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const quotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const showAlert = payToken && !quotesLoading && quotes === undefined;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        key: AlertKeys.PerpsDepositMinimum,
        field: RowAlertKey.PayWith,
        message: 'Change the amount or select a different token for payment.',
        title: "We couldn't find any quotes.",
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [showAlert]);
}
