import { useMemo } from 'react';
import { useSelector } from 'react-redux';
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
import { useTokenAmount } from '../useTokenAmount';
import { hasTransactionType } from '../../utils/transaction';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';

export function useInsufficientPerpsBalanceAlert({
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

  // `withdrawableBalance` is the Unified-aware value populated by
  // `addSpotBalanceToAccountState` and matches what `withdraw3` draws from.
  const withdrawableBalance = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.accountState
        ?.withdrawableBalance,
  );

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionMeta?.id ?? ''),
  );
  const isMoneyAccountWithdraw =
    paymentOverride === PaymentOverride.MoneyAccount;

  const isPerpsWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
  ]);

  const isPendingInput = pendingAmount !== undefined;

  const isInsufficient = useMemo(() => {
    if (!isPerpsWithdraw) return false;

    if (
      withdrawableBalance !== undefined &&
      withdrawableBalance !== null &&
      new BigNumber(withdrawableBalance).isLessThan(amountHuman)
    ) {
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

      if (totalFees.isGreaterThanOrEqualTo(amountHuman)) {
        return true;
      }

      // Standard withdrawals deduct fees from the receive amount, so only
      // money-account withdrawals need balance to cover amount + fees.
      if (
        isMoneyAccountWithdraw &&
        withdrawableBalance !== undefined &&
        withdrawableBalance !== null &&
        new BigNumber(amountHuman)
          .plus(totalFees)
          .isGreaterThan(withdrawableBalance)
      ) {
        return true;
      }
    }

    return false;
  }, [
    amountHuman,
    hasQuotes,
    isMoneyAccountWithdraw,
    isPendingInput,
    isPerpsWithdraw,
    withdrawableBalance,
    totals,
  ]);

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPerpsBalance,
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
