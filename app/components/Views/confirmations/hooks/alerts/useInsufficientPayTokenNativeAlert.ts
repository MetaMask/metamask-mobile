import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { useSelector } from 'react-redux';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { getNativeTokenAddress } from '../../utils/asset';

export function useInsufficientPayTokenNativeAlert(): Alert[] {
  const { totalNetworkFeeMax, total } = useTransactionTotalFiat();
  const { payToken } = useTransactionPayToken();
  const { chainId } = payToken ?? {};
  const nativeTokenAddress = getNativeTokenAddress(chainId ?? '0x0');

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, chainId ?? '0x0'),
  );

  const nativeToken = useTokenWithBalance(nativeTokenAddress, chainId ?? '0x0');

  const { tokenFiatAmount } = nativeToken ?? {};
  const isPayTokenNative = payToken?.address === nativeTokenAddress;
  const requiredAmount = isPayTokenNative ? total : totalNetworkFeeMax;

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
        message: strings('alert_system.insufficient_pay_token_native.message', {
          ticker,
        }),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient, ticker]);
}
