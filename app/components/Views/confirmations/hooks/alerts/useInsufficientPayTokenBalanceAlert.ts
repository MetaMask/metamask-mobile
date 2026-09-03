import { useMemo } from 'react';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
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
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPaySelectedFiatPaymentMethod } from '../pay/useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import {
  CHAIN_IDS,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { MM_PAY_TRANSACTION_TYPES } from '../../constants/confirmations';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { isTransactionMarkedAsGasFeeSponsored } from '../../utils/transaction';

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
  const payingAccount = useTransactionPayingAccount();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionMeta?.id ?? ''),
  );

  // In post-quote (withdrawal) flows, payToken is the *destination* token,
  // so payToken.chainId is the destination chain. The source chain (where gas
  // is actually paid) is the transaction's own chainId.
  const sourceChainId = isPostQuote
    ? (transactionMeta?.chainId ?? '0x0')
    : (payToken?.chainId ?? '0x0');

  const nativeToken = useTokenWithBalance(
    getNativeTokenAddress(sourceChainId),
    sourceChainId,
    payingAccount,
  );

  // Single source of truth for the spendable balance across every Pay flow
  // (wallet, perps/predict/money withdraw, money-account override), already
  // resolved to the correct per-flow balance in both USD display units and raw
  // on-chain units.
  const { balanceUsd: payBalanceUsd, balanceRaw } = useTransactionPayBalance();
  const balanceUsd = String(payBalanceUsd);

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

  // For Max, treat the spend amount as the available balance so fiat rounding
  // between a Max snapshot and the live balance cannot false-positive.
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

  const isInsufficientForInput = useMemo(
    () => totalAmountUsd.isGreaterThan(balanceUsd ?? '0'),
    [balanceUsd, totalAmountUsd],
  );

  // Skip for Max: source amount is the full pay-token balance (or already
  // reduced to leave room for gas). Quote rounding and adding source-network
  // fees on top of that amount can make source+fees > live balance even
  // though Max is valid — same class of false positive as money-account Max.
  const isInsufficientForFees = useMemo(
    () =>
      !isMax &&
      !isPendingAlert &&
      totalSourceAmountRaw.isGreaterThan(balanceRaw ?? '0'),
    [balanceRaw, isMax, isPendingAlert, totalSourceAmountRaw],
  );

  // The source chain does not draw native gas from the user's EOA when any of:
  // - it is inherently gasless (Monad),
  // - the gas fee is explicitly sponsored for this transaction, or
  // - the transaction is funded via a payment override in a deposit-direction
  //   flow (`!isPostQuote`), where gas is sponsored by the override path rather
  //   than paid from the user's native balance. Post-quote (withdrawal) flows
  //   still pay gas on the source chain, so the override alone is not enough.
  const isGaslessSourceChain =
    sourceChainId === CHAIN_IDS.MONAD ||
    isTransactionMarkedAsGasFeeSponsored(transactionMeta) ||
    (!isPostQuote && paymentOverride === PaymentOverride.MoneyAccount);

  // A plain ERC-20 send also yields a required token, but it is not funded
  // through MetaMask Pay, so the pay balance check does not apply.
  const isMMPayTransaction = hasTransactionType(
    transactionMeta,
    MM_PAY_TRANSACTION_TYPES,
  );

  // For non-gasless source chains we still need to check the user has enough
  // native token to pay for gas on the source network (e.g., POL for Polygon).
  const isInsufficientForSourceNetwork = useMemo(
    () =>
      !isGaslessSourceChain &&
      !isPayTokenNative &&
      !isPendingAlert &&
      !isSourceGasFeeToken &&
      totalSourceNetworkFeeRaw.isGreaterThan(nativeToken?.balanceRaw ?? '0'),
    [
      isGaslessSourceChain,
      isPayTokenNative,
      isPendingAlert,
      isSourceGasFeeToken,
      nativeToken?.balanceRaw,
      totalSourceNetworkFeeRaw,
    ],
  );

  return useMemo(() => {
    const baseAlert = {
      field: RowAlertKey.Amount,
      severity: Severity.Danger,
      isBlocking: true,
    };

    if (selectedFiatPaymentMethod || !isMMPayTransaction) {
      return [];
    }

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
            'alert_system.insufficient_pay_method_balance.message',
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
            isPostQuote
              ? 'alert_system.insufficient_pay_token_native_post_quote.message'
              : 'alert_system.insufficient_pay_token_native.message',
            { ticker },
          ),
        },
      ];
    }

    return [];
  }, [
    isMMPayTransaction,
    isInsufficientForInput,
    isInsufficientForFees,
    isInsufficientForSourceNetwork,
    isPostQuote,
    selectedFiatPaymentMethod,
    ticker,
  ]);
}
