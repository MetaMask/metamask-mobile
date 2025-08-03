import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { useTransactionPayTokenAmounts } from '../pay/useTransactionPayTokenAmounts';

export function useInsufficientPayTokenBalance(): Alert[] {
  const { totalHuman } = useTransactionPayTokenAmounts();
  const { balanceHuman } = useTransactionPayToken();

  const isInsufficient = new BigNumber(balanceHuman ?? '0').isLessThan(
    new BigNumber(totalHuman ?? '0'),
  );

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPayTokenBalance,
        field: RowAlertKey.Amount,
        message: `Insufficient funds. Select different token.`,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
