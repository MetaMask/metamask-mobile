import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { useSelector } from 'react-redux';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { getNativeTokenAddress } from '../../utils/asset';

export function useInsufficientPayTokenBalanceAlert({
  pendingAmountUsd,
}: {
  pendingAmountUsd?: string;
} = {}): Alert[] {
  const { payToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const totals = useTransactionPayTotals();
  const isLoading = useIsTransactionPayLoading();
  const isSourceGasFeeToken = totals?.fees.isSourceGasFeeToken ?? false;
  const isPendingAlert = Boolean(pendingAmountUsd !== undefined);

  const sourceChainId = payToken?.chainId ?? '0x0';

  const nativeToken = useTokenWithBalance(
    getNativeTokenAddress(sourceChainId),
    sourceChainId,
  );

  const { balanceUsd, balanceRaw } = payToken ?? {};

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, sourceChainId),
  );

  const isPayTokenNative =
    Boolean(payToken) &&
    payToken?.address.toLowerCase() === nativeToken?.address.toLowerCase();

  const totalAmountUsd = useMemo(
    () =>
      pendingAmountUsd
        ? new BigNumber(pendingAmountUsd)
        : requiredTokens
            .filter((t) => !t.skipIfBalance)
            .reduce(
              (acc, t) => acc.plus(new BigNumber(t.amountUsd)),
              new BigNumber(0),
            ),
    [pendingAmountUsd, requiredTokens],
  );

  const totalSourceAmountRaw = useMemo(() => {
    if (isLoading) {
      return new BigNumber(0);
    }

    return new BigNumber(totals?.sourceAmount.raw ?? '0').plus(
      isPayTokenNative || isSourceGasFeeToken
        ? new BigNumber(totals?.fees.sourceNetwork.max.raw ?? '0')
        : '0',
    );
  }, [isLoading, isPayTokenNative, isSourceGasFeeToken, totals]);

  const totalSourceNetworkFeeRaw = useMemo(() => {
    if (isLoading) {
      return new BigNumber(0);
    }

    return new BigNumber(totals?.fees.sourceNetwork.max.raw ?? '0');
  }, [isLoading, totals]);

  const isInsufficientForInput = useMemo(
    () => payToken && totalAmountUsd.isGreaterThan(balanceUsd ?? '0'),
    [balanceUsd, payToken, totalAmountUsd],
  );

  const isInsufficientForFees = useMemo(
    () =>
      !isPendingAlert &&
      payToken &&
      totalSourceAmountRaw.isGreaterThan(balanceRaw ?? '0'),
    [balanceRaw, isPendingAlert, payToken, totalSourceAmountRaw],
  );

  const isInsufficientForSourceNetwork = useMemo(
    () =>
      payToken &&
      !isPayTokenNative &&
      !isPendingAlert &&
      !isSourceGasFeeToken &&
      totalSourceNetworkFeeRaw.isGreaterThan(nativeToken?.balanceRaw ?? '0'),
    [
      isPayTokenNative,
      isPendingAlert,
      isSourceGasFeeToken,
      nativeToken?.balanceRaw,
      payToken,
      totalSourceNetworkFeeRaw,
    ],
  );

  return useMemo(() => {
    const baseAlert = {
      field: RowAlertKey.Amount,
      severity: Severity.Danger,
      isBlocking: true,
    };

    if (isInsufficientForInput) {
      return [
        {
          ...baseAlert,
          key: AlertKeys.InsufficientPayTokenBalance,
          message: strings(
            'alert_system.insufficient_pay_token_balance.message',
          ),
        },
      ];
    }

    if (isInsufficientForFees) {
      return [
        {
          ...baseAlert,
          key: AlertKeys.InsufficientPayTokenFees,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_balance_fees_no_target.message',
          ),
        },
      ];
    }

    if (isInsufficientForSourceNetwork) {
      return [
        {
          ...baseAlert,
          key: AlertKeys.InsufficientPayTokenNative,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native.message',
            { ticker },
          ),
        },
      ];
    }

    return [];
  }, [
    isInsufficientForInput,
    isInsufficientForFees,
    isInsufficientForSourceNetwork,
    ticker,
  ]);
}
