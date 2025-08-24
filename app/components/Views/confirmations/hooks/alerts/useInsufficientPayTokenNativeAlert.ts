import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

export function useInsufficientPayTokenNativeAlert(): Alert[] {
  const { quoteNetworkFee } = useTransactionTotalFiat();
  const { payToken } = useTransactionPayToken();
  const { chainId } = payToken ?? {};
  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);
  const tokens = useTokensWithBalance({ chainIds });
  const nativeToken = tokens.find((t) => t.address === NATIVE_TOKEN_ADDRESS);
  const { tokenFiatAmount } = nativeToken ?? {};

  const isInsufficient = new BigNumber(tokenFiatAmount ?? '0').isLessThan(
    new BigNumber(quoteNetworkFee ?? '0'),
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
