import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { hasTransactionType } from '../../utils/transaction';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';

export function useInsufficientPredictBalanceAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { amountPrecise } = useTokenAmount();
  const amountHuman = pendingAmount ?? amountPrecise ?? '0';
  const totals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const hasQuotes = Boolean(quotes?.length);

  const { data: predictBalanceHuman = 0 } = usePredictBalance();

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionMeta?.id ?? ''),
  );
  const isMoneyPaymentOverride =
    paymentOverride === PaymentOverride.MoneyAccount;

  const isPendingInput = pendingAmount !== undefined;

  const isInsufficient = useMemo(() => {
    if (!isPredictWithdraw) return false;

    // When the destination is the Money Account, the withdrawn funds bridge
    // into it and the vault deposit runs post-Relay; the predict balance/fees
    // check does not apply. useInsufficientMoneyAccountBalanceAlert covers it.
    if (isMoneyPaymentOverride) return false;

    if (new BigNumber(predictBalanceHuman ?? '0').isLessThan(amountHuman)) {
      return true;
    }

    // Skip during input — totals may be stale.
    if (
      !isPendingInput &&
      hasQuotes &&
      totals?.fees &&
      new BigNumber(amountHuman).isGreaterThan(0)
    ) {
      const totalFees = new BigNumber(totals.fees.provider?.usd ?? 0)
        .plus(totals.fees.sourceNetwork?.estimate?.usd ?? 0)
        .plus(totals.fees.targetNetwork?.usd ?? 0)
        .plus(totals.fees.metaMask?.usd ?? 0);

      if (
        new BigNumber(amountHuman)
          .plus(totalFees)
          .isGreaterThan(predictBalanceHuman ?? '0')
      ) {
        return true;
      }
    }

    return false;
  }, [
    amountHuman,
    hasQuotes,
    isMoneyPaymentOverride,
    isPendingInput,
    isPredictWithdraw,
    predictBalanceHuman,
    totals,
  ]);

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        title: strings('alert_system.insufficient_pay_token_balance.message'),
        message: strings(
          'alert_system.insufficient_pay_method_balance.message',
        ),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}