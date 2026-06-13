import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { MONEY_ACCOUNT_CURRENCY } from '../../components/info/money-account-withdraw-info/money-account-withdraw-info';
import { useMMPayFiatConfig } from '../pay/useMMPayFiatConfig';

export function useFiatBuyLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const fiatPayment = useTransactionPayFiatPayment();
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const isFiatEnabledTransactionType = hasTransactionType(
    transactionMeta,
    enabledTransactionTypes,
  );

  const isGated = isFiatEnabledTransactionType && Boolean(paymentMethodId);

  const amount = Number(pendingAmount ?? fiatPayment?.amountFiat ?? '0');

  // MM Pay fiat input is USD-denominated; use USD limits, not local currency (e.g. BRL).
  const { amountLimitError } = useRampsBuyLimits({
    amount,
    paymentMethodId,
    currency: MONEY_ACCOUNT_CURRENCY,
  });

  return useMemo(() => {
    if (!isGated || !amountLimitError) {
      return [];
    }

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: amountLimitError,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isGated, amountLimitError]);
}
