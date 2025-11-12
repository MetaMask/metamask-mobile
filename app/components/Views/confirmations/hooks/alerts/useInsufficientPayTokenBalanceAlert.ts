import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import { useTransactionPayRequiredTokens } from '../pay/useTransactionPayData';

export function useInsufficientPayTokenBalanceAlert({
  amountFiatOverride,
}: {
  amountFiatOverride?: string;
} = {}): Alert[] {
  const { payToken } = useTransactionPayToken();
  const { balanceUsd } = payToken ?? {};
  const requiredTokens = useTransactionPayRequiredTokens();

  const totalAmountUsd = (requiredTokens ?? [])
    .filter((t) => !t.skipIfBalance)
    .reduce<BigNumber>(
      (total, token) => total.plus(token.amountUsd),
      new BigNumber(0),
    );

  const isInsufficientForAmount =
    payToken &&
    new BigNumber(balanceUsd ?? '0').isLessThan(
      amountFiatOverride ?? totalAmountUsd,
    );

  return useMemo(() => {
    if (!isInsufficientForAmount) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPayTokenBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficientForAmount]);
}
