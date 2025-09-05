import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';

export function useInsufficientPayTokenNativeAlert(): Alert[] {
  const { quoteNetworkFee, value } = useTransactionTotalFiat();
  const { payToken } = useTransactionPayToken();
  const { chainId } = payToken ?? {};

  const nativeToken = useTokenWithBalance(
    NATIVE_TOKEN_ADDRESS,
    chainId ?? '0x0',
  );

  const { tokenFiatAmount } = nativeToken ?? {};
  const isPayTokenNative = payToken?.address === NATIVE_TOKEN_ADDRESS;
  const requiredAmount = isPayTokenNative ? value : quoteNetworkFee;

  const isInsufficient =
    payToken &&
    new BigNumber(tokenFiatAmount ?? '0').isLessThan(
      new BigNumber(requiredAmount ?? '0'),
    );

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.insufficient_pay_token_native.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
