import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { useMoneyAccountFiatDepositAssetId } from '../../../../UI/Ramp/hooks/useMoneyAccountFiatDepositAssetId';

export function useFiatBuyLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const fiatPayment = useTransactionPayFiatPayment();
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const flagAssetId = useMoneyAccountFiatDepositAssetId();
  const assetId = fiatPayment?.caipAssetId ?? flagAssetId;

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const isGated = isMoneyAccountDeposit && Boolean(paymentMethodId);

  const amount = Number(pendingAmount ?? fiatPayment?.amountFiat ?? '0');

  // Only treat the backend message as a limit error when the provider
  // explicitly classified it as LIMIT_EXCEEDED. Generic QUOTE_FAILED messages
  // are left to useNoPayTokenQuotesAlert so they are not mislabelled as limits.
  const backendError =
    fiatPayment?.quoteError?.code === 'LIMIT_EXCEEDED'
      ? fiatPayment.quoteError.message
      : undefined;

  const { amountLimitError } = useRampsBuyLimits({
    assetId: isGated ? assetId : undefined,
    amount,
    paymentMethodId,
    backendError,
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
