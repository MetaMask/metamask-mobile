import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { useTransactionPayTokenAmounts } from '../pay/useTransactionPayTokenAmounts';
import { strings } from '../../../../../../locales/i18n';

export function useInsufficientPayTokenBalanceAlert(): Alert[] {
  const { totalHuman } = useTransactionPayTokenAmounts();
  const { balanceHuman } = useTransactionPayToken();

  const isInsufficient =
    new BigNumber(balanceHuman ?? '0').isLessThan(
      new BigNumber(totalHuman ?? '0'),
    ) && process.env.MM_CONFIRMATION_INTENTS === 'true';

  return useMemo(() => {
    if (!isInsufficient) {
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
  }, [isInsufficient]);
}
