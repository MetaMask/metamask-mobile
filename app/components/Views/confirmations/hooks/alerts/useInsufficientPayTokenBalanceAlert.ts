import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { useTransactionPayTokenAmounts } from '../pay/useTransactionPayTokenAmounts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

export function useInsufficientPayTokenBalanceAlert({
  amountOverrides,
}: {
  amountOverrides?: Record<Hex, string>;
} = {}): Alert[] {
  const { type } = useTransactionMetadataRequest() ?? {};
  const { totalHuman } = useTransactionPayTokenAmounts({ amountOverrides });
  const { payToken } = useTransactionPayToken();
  const { balance } = payToken ?? {};

  const isInsufficient =
    new BigNumber(balance ?? '0').isLessThan(
      new BigNumber(totalHuman ?? '0'),
    ) && type === TransactionType.perpsDeposit;

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
