import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectTransactionPayTokensByTransactionId } from '../../../../../selectors/transactionPayController';
import { BigNumber } from 'bignumber.js';

export function useInsufficientPayTokenBalanceAlert({
  amountFiatOverride,
}: {
  amountFiatOverride?: string;
} = {}): Alert[] {
  const { id: transactionId } = useTransactionMetadataRequest() ?? { id: '' };
  const { payToken } = useTransactionPayToken();
  const { balanceUsd, symbol } = payToken ?? {};

  const requiredTokens = useSelector((state: RootState) =>
    selectTransactionPayTokensByTransactionId(state, transactionId as Hex),
  );

  const totalAmountUsd = (requiredTokens ?? []).reduce<BigNumber>(
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
  }, [isInsufficientForAmount, symbol]);
}
