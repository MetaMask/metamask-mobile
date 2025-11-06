import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPredictBalanceByAddress } from '../../components/predict-confirmations/predict-temp';
import { useTokenAmount } from '../useTokenAmount';
import { hasTransactionType } from '../../utils/transaction';

export function useInsufficientPredictBalanceAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const from = (transactionMeta?.txParams?.from ?? '0x0') as Hex;
  const { usdValue } = useTokenAmount();
  const amountFiat = pendingAmount ?? usdValue ?? '0';

  const predictBalanceFiat = useSelector((state: RootState) =>
    selectPredictBalanceByAddress(state, from),
  );

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const isInsufficient = useMemo(
    () =>
      isPredictWithdraw &&
      new BigNumber(predictBalanceFiat ?? '0').isLessThan(amountFiat),
    [amountFiat, isPredictWithdraw, predictBalanceFiat],
  );

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
