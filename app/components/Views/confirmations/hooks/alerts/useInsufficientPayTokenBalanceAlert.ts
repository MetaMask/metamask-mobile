import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { useSelector } from 'react-redux';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

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
  const isMax = useTransactionPayIsMaxAmount();
  const isPostQuote = useTransactionPayIsPostQuote();
  const transactionMeta = useTransactionMetadataRequest();

  // In post-quote (withdrawal) flows, payToken is the *destination* token,
  // so payToken.chainId is the destination chain. The source chain (where gas
  // is actually paid) is the transaction's own chainId.
  const sourceChainId = isPostQuote
    ? (transactionMeta?.chainId ?? '0x0')
    : (payToken?.chainId ?? '0x0');

  const nativeToken = useTokenWithBalance(
    getNativeTokenAddress(sourceChainId),
    sourceChainId,
  );

  const { balanceUsd, balanceRaw } = payToken ?? {};

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, sourceChainId),
  );

  // Must also compare chainId: in post-quote withdrawals payToken is on the
  // destination chain, which may share the same native-token address as the
  // source chain. Without the chainId guard, a native destination token would
  // incorrectly suppress the source-network gas insufficiency check.
  const isPayTokenNative =
    Boolean(payToken) &&
    payToken?.address.toLowerCase() === nativeToken?.address.toLowerCase() &&
    payToken?.chainId === sourceChainId;

  const totalAmountUsd = useMemo(
    () =>
      isMax
        ? new BigNumber(balanceUsd ?? '0')
        : pendingAmountUsd
          ? new BigNumber(pendingAmountUsd)
          : requiredTokens
              .filter((t) => !t.skipIfBalance)
              .reduce(
                (acc, t) => acc.plus(new BigNumber(t.amountUsd)),
                new BigNumber(0),
              ),
    [balanceUsd, isMax, pendingAmountUsd, requiredTokens],
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

  // For post-quote (withdrawal) flows, the source funds come from the withdrawal
  // transaction itself, not from the user's existing balance. Skip input/fees checks.
  const isInsufficientForInput = useMemo(
    () =>
      !isPostQuote &&
      payToken &&
      totalAmountUsd.isGreaterThan(balanceUsd ?? '0'),
    [balanceUsd, isPostQuote, payToken, totalAmountUsd],
  );

  const isInsufficientForFees = useMemo(
    () =>
      !isPostQuote &&
      !isPendingAlert &&
      payToken &&
      totalSourceAmountRaw.isGreaterThan(balanceRaw ?? '0'),
    [balanceRaw, isPendingAlert, isPostQuote, payToken, totalSourceAmountRaw],
  );

  // For post-quote flows, we still need to check if the user has enough native
  // token to pay for gas on the source network (e.g., POL for Polygon)
  // In post-quote (withdrawal) flows payToken may be unset when the user keeps
  // the default receive token (auto-selection is intentionally skipped). The
  // source-network gas check only needs the native token balance vs. the fee,
  // both of which are independent of payToken, so allow it to run when
  // payToken is absent as long as we're in a post-quote flow.
  const isInsufficientForSourceNetwork = useMemo(
    () =>
      (payToken || isPostQuote) &&
      !isPayTokenNative &&
      !isPendingAlert &&
      !isSourceGasFeeToken &&
      totalSourceNetworkFeeRaw.isGreaterThan(nativeToken?.balanceRaw ?? '0'),
    [
      isPayTokenNative,
      isPendingAlert,
      isPostQuote,
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
