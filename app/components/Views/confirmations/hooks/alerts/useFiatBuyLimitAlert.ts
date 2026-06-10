import { useMemo } from 'react';
import { useSelector } from 'react-redux';
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
import { MONEY_ACCOUNT_CURRENCY } from '../../components/info/money-account-withdraw-info/money-account-withdraw-info';
import { selectProviders } from '../../../../../../selectors/rampsController';

export function useFiatBuyLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const fiatPayment = useTransactionPayFiatPayment();
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const { selected: provider } = useSelector(selectProviders);

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const isGated = isMoneyAccountDeposit && Boolean(paymentMethodId);

  const amount = Number(pendingAmount ?? fiatPayment?.amountFiat ?? '0');

  // moneyAccountDeposit input is always USD-denominated; use USD limits, not local currency (e.g. BRL).
  const { amountLimitError } = useRampsBuyLimits({
    provider,
    amount,
    paymentMethodId,
    currency: isMoneyAccountDeposit ? MONEY_ACCOUNT_CURRENCY : undefined,
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
