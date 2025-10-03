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
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

export function useInsufficientPayTokenBalanceAlert({
  amountOverrides,
}: {
  amountOverrides?: Record<Hex, string>;
} = {}): Alert[] {
  const { type } = useTransactionMetadataRequest() ?? {};

  const { payToken } = useTransactionPayToken();
  const { balance, symbol } = payToken ?? {};

  const { totalHuman, amounts } = useTransactionPayTokenAmounts({
    amountOverrides,
  });

  const tokenAmount =
    amounts?.find((a) => a.address !== NATIVE_TOKEN_ADDRESS)
      ?.amountHumanOriginal ?? '0';

  const balanceValue = new BigNumber(balance ?? '0');

  const isInsufficientForFees =
    type === TransactionType.perpsDeposit &&
    balanceValue.isLessThan(totalHuman ?? '0');

  const isInsufficientForAmount =
    isInsufficientForFees && balanceValue.isLessThan(tokenAmount);

  return useMemo(() => {
    if (!isInsufficientForFees && !isInsufficientForAmount) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPayTokenBalance,
        field: RowAlertKey.Amount,
        message: isInsufficientForAmount
          ? strings('alert_system.insufficient_pay_token_balance.message')
          : strings(
              'alert_system.insufficient_pay_token_balance_fees.message',
              { symbol },
            ),
        title: isInsufficientForAmount
          ? undefined
          : strings('alert_system.insufficient_pay_token_balance_fees.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficientForFees, isInsufficientForAmount, symbol]);
}
