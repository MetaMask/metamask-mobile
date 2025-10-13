import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { useSelector } from 'react-redux';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectTransactionPayTotalsByTransactionId } from '../../../../../selectors/transactionPayController';

export function useInsufficientPayTokenNativeAlert(): Alert[] {
  const { id: transactionId } = useTransactionMetadataRequest() ?? { id: '' };
  const { payToken } = useTransactionPayToken();
  const { chainId } = payToken ?? {};

  const totals = useSelector((state: RootState) =>
    selectTransactionPayTotalsByTransactionId(state, transactionId),
  );

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, chainId ?? '0x0'),
  );

  const nativeToken = useTokenWithBalance(
    NATIVE_TOKEN_ADDRESS,
    chainId ?? '0x0',
  );

  const { tokenFiatAmount } = nativeToken ?? {};
  const isPayTokenNative = payToken?.address === NATIVE_TOKEN_ADDRESS;

  const requiredAmount = isPayTokenNative
    ? totals?.total.fiat
    : totals?.fees.sourceNetwork.fiat;

  const isInsufficient = useMemo(
    () =>
      payToken &&
      new BigNumber(tokenFiatAmount ?? '0').isLessThan(
        new BigNumber(requiredAmount ?? '0'),
      ),
    [payToken, requiredAmount, tokenFiatAmount],
  );

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.insufficient_pay_token_native.message', {
          ticker,
        }),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient, ticker]);
}
