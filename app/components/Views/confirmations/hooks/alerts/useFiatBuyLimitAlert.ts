import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from '../../../../UI/Ramp/utils/getMoneyAccountFiatDepositAssetId';

export function useFiatBuyLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const fiatPayment = useTransactionPayFiatPayment();
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const assetId = fiatPayment?.caipAssetId ?? MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID;

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const isGated = isMoneyAccountDeposit && Boolean(paymentMethodId);

  const amount = Number(pendingAmount ?? fiatPayment?.amountFiat ?? '0');

  const { amountLimitError } = useRampsBuyLimits({
    assetId: isGated ? assetId : undefined,
    amount,
    paymentMethodId,
  });

  return useMemo(() => {
    if (!isGated || !amountLimitError) {
      return [];
    }

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        message: amountLimitError,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isGated, amountLimitError]);
}
