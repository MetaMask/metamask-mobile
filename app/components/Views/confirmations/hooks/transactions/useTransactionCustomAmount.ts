import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';
import { getTokenAddress } from '../../utils/transaction-pay';
import { useParams } from '../../../../../util/navigation/navUtils';
import { debounce } from 'lodash';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import Engine from '../../../../../core/Engine';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayFiatPayment,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayQuotesLastUpdated,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { useMMPayFiatConfig } from '../pay/useMMPayFiatConfig';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { MONEY_ACCOUNT_CURRENCY } from '../../components/info/money-account-withdraw-info/money-account-withdraw-info';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/hooks/useMoneyAccount';
import { useDepositPrefillAmount } from './useDepositPrefillAmount';
import { useConfirmationContext } from '../../context/confirmation-context';

export const MAX_LENGTH = 28;
const DEBOUNCE_DELAY = 300;

interface DepositPrefetchQuoteRequest {
  amountHuman: string;
  payTokenKey: string;
  isAmountPrepared: boolean;
  quoteBaseline: number | undefined;
  sawQuoteLoading: boolean;
}

function formatFiatAmount(value: BigNumber): string {
  return value.isInteger() ? value.toString(10) : value.toFixed(2);
}

export function useTransactionCustomAmount({
  currency,
}: { currency?: string } = {}) {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId, id: transactionId } = transactionMeta;

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const isAddMusdFlow =
    isMoneyAccountDeposit &&
    getMoneyAccountDepositIntent(transactionMeta?.batchId) === 'addMusd';

  const { amount: defaultAmount } = useParams<{ amount?: string }>();
  const [amountFiatState, setAmountFiat] = useState(defaultAmount ?? '0');
  const [isInputChanged, setInputChanged] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [amountHumanDebounced, setAmountHumanDebounced] = useState('0');
  const [amountFiatDebounced, setAmountFiatDebounced] = useState(
    defaultAmount ?? '0',
  );
  const totals = useTransactionPayTotals();
  const hasSourceAmount = useTransactionPayHasSourceAmount();
  const isPostQuote = useTransactionPayIsPostQuote();
  const isQuoteLoading = useIsTransactionPayQuoteLoading();
  const quotesLastUpdated = useTransactionPayQuotesLastUpdated();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const [isTokenAmountUpdated, setIsTokenAmountUpdated] = useState(false);
  const [isPrefillPending, setIsPrefillPending] = useState(isAddMusdFlow);
  const hasPrefilled = useRef(false);
  const depositMaxHumanRef = useRef<string | null>(null);
  const userHasEditedRef = useRef(false);
  // Dispatching the metric per keystroke triggers a store-wide selector sweep;
  // only dispatch when the input type actually changes.
  const lastAmountInputTypeRef = useRef<string | null>(null);
  const amountChangeTimeRef = useRef<number>(0);
  const prefetchQuoteRequestRef = useRef<
    DepositPrefetchQuoteRequest | undefined
  >(undefined);
  const prefetchedQuoteAmountHumanRef = useRef<string | undefined>(undefined);
  const prefetchedQuotePayTokenKeyRef = useRef<string | undefined>(undefined);
  const [prefetchedQuoteAmountHuman, setPrefetchedQuoteAmountHuman] =
    useState<string>();
  const [prefetchedQuotePayTokenKey, setPrefetchedQuotePayTokenKey] =
    useState<string>();
  const isQuoteLoadingRef = useRef(isQuoteLoading);
  const quotesLastUpdatedRef = useRef(quotesLastUpdated);
  isQuoteLoadingRef.current = isQuoteLoading;
  quotesLastUpdatedRef.current = quotesLastUpdated;

  const debounceSetAmountDelayed = useMemo(
    () =>
      debounce((humanValue: string, fiatValue: string) => {
        setAmountHumanDebounced(humanValue);
        setAmountFiatDebounced(fiatValue);
      }, DEBOUNCE_DELAY),
    [],
  );

  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const isPerpsWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
  ]);
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const tokenAddress = getTokenAddress(transactionMeta);
  const payTokenFiatRate = useTokenFiatRate(tokenAddress, chainId, currency);
  const musdFiatRate =
    useTokenFiatRate(
      MUSD_TOKEN_ADDRESS,
      MUSD_CONVERSION_DEFAULT_CHAIN_ID,
      currency,
    ) ?? 1;
  const tokenFiatRate = isMoneyAccountWithdraw
    ? musdFiatRate
    : payTokenFiatRate;
  const balanceUsd = useTokenBalance(tokenFiatRate);
  const { payToken } = useTransactionPayToken();
  const payTokenKey = `${payToken?.chainId ?? ''}:${
    payToken?.address.toLowerCase() ?? ''
  }`;
  const { setIsMaxDeposit } = useConfirmationContext();

  useEffect(() => {
    depositMaxHumanRef.current = null;
    userHasEditedRef.current = false;
    prefetchQuoteRequestRef.current = undefined;
    prefetchedQuoteAmountHumanRef.current = undefined;
    prefetchedQuotePayTokenKeyRef.current = undefined;
    setPrefetchedQuoteAmountHuman(undefined);
    setPrefetchedQuotePayTokenKey(undefined);
    setIsMaxDeposit(false);
  }, [payToken?.address, payToken?.chainId, setIsMaxDeposit]);

  const { isAmountUpdateQuotePipelineEnabled, updateTransactionPayAmount } =
    useUpdateTransactionPayAmount();

  const depositPrefill = useDepositPrefillAmount();

  useEffect(() => {
    if (!isMoneyAccountDeposit || !isAmountUpdateQuotePipelineEnabled) {
      return;
    }

    const prefetchRequest = prefetchQuoteRequestRef.current;
    if (!prefetchRequest?.isAmountPrepared) {
      return;
    }

    if (isQuoteLoading) {
      prefetchRequest.sawQuoteLoading = true;
      return;
    }

    const hasNewerQuote =
      prefetchRequest.sawQuoteLoading &&
      quotesLastUpdated !== undefined &&
      (prefetchRequest.quoteBaseline === undefined ||
        quotesLastUpdated > prefetchRequest.quoteBaseline);
    if (
      hasNewerQuote &&
      (prefetchedQuoteAmountHumanRef.current !== prefetchRequest.amountHuman ||
        prefetchedQuotePayTokenKeyRef.current !== prefetchRequest.payTokenKey)
    ) {
      prefetchedQuoteAmountHumanRef.current = prefetchRequest.amountHuman;
      prefetchedQuotePayTokenKeyRef.current = prefetchRequest.payTokenKey;
      setPrefetchedQuoteAmountHuman(prefetchRequest.amountHuman);
      setPrefetchedQuotePayTokenKey(prefetchRequest.payTokenKey);
    }
  }, [
    isAmountUpdateQuotePipelineEnabled,
    isMoneyAccountDeposit,
    isQuoteLoading,
    quotesLastUpdated,
  ]);

  const prevHasPrefilled = useRef(depositPrefill.hasPrefilled);
  useEffect(() => {
    // Skip if the user has manually typed on the keypad — a transient
    // hasPrefilled toggle (from tokenKey changes) must not overwrite
    // their input. The ref resets when the pay token genuinely changes.
    if (userHasEditedRef.current) {
      prevHasPrefilled.current = depositPrefill.hasPrefilled;
      return;
    }
    if (depositPrefill.hasPrefilled) {
      amountChangeTimeRef.current = Date.now();
      setAmountFiat(depositPrefill.prefillAmount ?? '0');
    } else if (prevHasPrefilled.current) {
      setAmountFiat('0');
    }
    prevHasPrefilled.current = depositPrefill.hasPrefilled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositPrefill.hasPrefilled]);

  // Gating mirrors useFiatBuyLimitAlert so the keypad cap and the limit alert agree.
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const fiatPaymentMethodId =
    useTransactionPayFiatPayment()?.selectedPaymentMethodId;
  const isFiatBuyLimited =
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    Boolean(fiatPaymentMethodId);
  const { maxAmount: fiatMaxAmount } = useRampsBuyLimits({
    amount: 0,
    paymentMethodId: fiatPaymentMethodId,
    currency: MONEY_ACCOUNT_CURRENCY,
  });

  const amountFiat = useMemo(() => {
    const targetAmountUsd = totals?.targetAmount.usd;

    // For withdrawals, targetAmount.usd is the destination-side received
    // value (e.g. BNB after bridge fees), not the amount being withdrawn.
    // The input field should always display what the user is withdrawing.
    if (
      !isWithdraw &&
      isMaxAmount &&
      targetAmountUsd &&
      targetAmountUsd !== '0'
    ) {
      return formatFiatAmount(
        new BigNumber(targetAmountUsd).decimalPlaces(
          2,
          BigNumber.ROUND_HALF_UP,
        ),
      );
    }

    return amountFiatState;
  }, [amountFiatState, isMaxAmount, isWithdraw, totals?.targetAmount.usd]);

  const amountHuman = useMemo(
    () =>
      tokenFiatRate
        ? new BigNumber(amountFiat || '0').dividedBy(tokenFiatRate).toString(10)
        : '0',
    [amountFiat, tokenFiatRate],
  );

  useEffect(() => {
    debounceSetAmountDelayed(amountHuman, amountFiat);

    // Clearing the input should drop pending-amount alerts immediately —
    // don't make the user wait out the debounce for a stale error to vanish.
    if (amountFiat === '0' || amountFiat === '') {
      debounceSetAmountDelayed.flush();
    }

    return () => debounceSetAmountDelayed.cancel();
  }, [amountHuman, amountFiat, debounceSetAmountDelayed]);

  useEffect(() => {
    if (amountHumanDebounced !== '0') {
      setInputChanged(true);
    }

    setHasInput(
      Boolean(amountHumanDebounced?.length) && amountHumanDebounced !== '0',
    );
  }, [amountHumanDebounced]);

  useEffect(() => {
    if (!isAmountUpdateQuotePipelineEnabled || amountHumanDebounced === '0') {
      return;
    }

    const depositMaxHuman = depositMaxHumanRef.current;
    const effectiveHuman = depositMaxHuman ?? amountHumanDebounced;
    const isNewPrefetch =
      prefetchQuoteRequestRef.current?.amountHuman !== effectiveHuman ||
      prefetchQuoteRequestRef.current?.payTokenKey !== payTokenKey;
    if (isNewPrefetch) {
      prefetchQuoteRequestRef.current = {
        amountHuman: effectiveHuman,
        payTokenKey,
        isAmountPrepared: false,
        quoteBaseline: quotesLastUpdatedRef.current,
        sawQuoteLoading: false,
      };
      prefetchedQuoteAmountHumanRef.current = undefined;
      setPrefetchedQuoteAmountHuman(undefined);
    }

    // Prefetch failures stay speculative. Continue retries the cleared request
    // and uses the existing toast path if the committed update also fails.
    updateTransactionPayAmount(effectiveHuman).then(
      (isPublished) => {
        if (!isPublished) {
          return;
        }

        const prefetchRequest = prefetchQuoteRequestRef.current;
        if (
          isNewPrefetch &&
          prefetchRequest?.amountHuman === effectiveHuman &&
          prefetchRequest.payTokenKey === payTokenKey
        ) {
          prefetchRequest.isAmountPrepared = true;
          prefetchRequest.quoteBaseline = quotesLastUpdatedRef.current;
          prefetchRequest.sawQuoteLoading = isQuoteLoadingRef.current;
        }
      },
      () => {
        if (
          prefetchQuoteRequestRef.current?.amountHuman === effectiveHuman &&
          prefetchQuoteRequestRef.current.payTokenKey === payTokenKey
        ) {
          prefetchQuoteRequestRef.current = undefined;
        }
      },
    );
  }, [
    amountHumanDebounced,
    isAmountUpdateQuotePipelineEnabled,
    payTokenKey,
    updateTransactionPayAmount,
  ]);

  const setIsMax = useCallback(
    (value: boolean) => {
      const { TransactionPayController } = Engine.context;

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isMaxAmount = value;
      });
    },
    [transactionId],
  );

  const updatePendingAmount = useCallback(
    (value: string) => {
      let newAmount = value.replace(/^0+/, '') || '0';

      if (newAmount.startsWith('.') || newAmount.startsWith(',')) {
        newAmount = '0' + newAmount;
      }

      if (newAmount.length >= MAX_LENGTH) {
        return;
      }

      if (
        isFiatBuyLimited &&
        fiatMaxAmount != null &&
        Number(newAmount) > fiatMaxAmount
      ) {
        return;
      }

      if (isMaxAmount) {
        setIsMax(false);
      }

      depositMaxHumanRef.current = null;
      userHasEditedRef.current = true;
      amountChangeTimeRef.current = Date.now();
      setIsMaxDeposit(false);

      if (lastAmountInputTypeRef.current !== 'manual') {
        lastAmountInputTypeRef.current = 'manual';

        setConfirmationMetric({
          properties: {
            mm_pay_amount_input_type: 'manual',
          },
        });
      }

      setAmountFiat(newAmount);
    },
    [
      isFiatBuyLimited,
      fiatMaxAmount,
      isMaxAmount,
      setIsMax,
      setIsMaxDeposit,
      setConfirmationMetric,
    ],
  );

  const updatePendingAmountPercentage = useCallback(
    (percentage: number): boolean => {
      if (!balanceUsd) {
        // No balance to derive a percentage/Max amount from — signal the caller
        // that nothing was applied so it can avoid submitting the page.
        return false;
      }

      const newAmount = formatFiatAmount(
        new BigNumber(percentage)
          .dividedBy(100)
          .multipliedBy(balanceUsd)
          .decimalPlaces(2, BigNumber.ROUND_DOWN),
      );

      lastAmountInputTypeRef.current = `${percentage}%`;
      amountChangeTimeRef.current = Date.now();

      setConfirmationMetric({
        properties: {
          mm_pay_amount_input_type: `${percentage}%`,
        },
      });

      // Do NOT set isMaxAmount=true for perps or money-account withdraw. TPC's
      // calculatePostQuoteSourceAmounts substitutes `token.balanceRaw` when
      // isMaxAmount is true: wrong for HyperLiquid (wallet USDC vs typed HL
      // balance) and wrong for money account (on-chain mUSD only vs mUSD +
      // vmUSD fiat total). Keeping isMaxAmount false routes the typed
      // amount through as token.amountRaw.
      const shouldSetMax =
        percentage === 100 &&
        !isPerpsWithdraw &&
        !isMoneyAccountWithdraw &&
        !isMoneyAccountDeposit;

      if (shouldSetMax) {
        setIsMax(true);
      } else if (isMaxAmount) {
        setIsMax(false);
      }

      // For money account deposit max, store the full-precision human amount
      // derived directly from the raw token balance. This bypasses the lossy
      // fiat roundtrip (ROUND_DOWN → ÷ rate → × 10^decimals → ROUND_UP) that
      // can inflate the required amount past the actual balance.
      const isMaxMoneyAccountDeposit =
        percentage === 100 && isMoneyAccountDeposit;

      if (isMaxMoneyAccountDeposit && payToken?.balanceRaw) {
        depositMaxHumanRef.current = new BigNumber(payToken.balanceRaw)
          .shiftedBy(-(payToken.decimals ?? 6))
          .toString(10);
      } else {
        depositMaxHumanRef.current = null;
      }

      // Flag a Max money account deposit so the insufficient-funds alert can
      // skip it — the submitted token amount is clamped to the raw balance, so
      // it can never truly exceed the balance despite fiat-rounding drift.
      setIsMaxDeposit(isMaxMoneyAccountDeposit);

      setAmountFiat(newAmount);
      return true;
    },
    [
      balanceUsd,
      isMaxAmount,
      isPerpsWithdraw,
      isMoneyAccountWithdraw,
      isMoneyAccountDeposit,
      payToken?.balanceRaw,
      payToken?.decimals,
      setIsMax,
      setIsMaxDeposit,
      setConfirmationMetric,
    ],
  );

  useEffect(() => {
    if (
      isAddMusdFlow &&
      balanceUsd &&
      balanceUsd > 0 &&
      !hasPrefilled.current
    ) {
      hasPrefilled.current = true;
      updatePendingAmountPercentage(100);
      setIsPrefillPending(false);
    }
  }, [isAddMusdFlow, balanceUsd, updatePendingAmountPercentage]);

  const updateTokenAmount = useCallback(async () => {
    const effectiveHuman = depositMaxHumanRef.current ?? amountHuman;
    await updateTransactionPayAmount(effectiveHuman);
    setIsTokenAmountUpdated(true);
  }, [amountHuman, updateTransactionPayAmount]);

  useEffect(() => {
    if (isTokenAmountUpdated && (hasSourceAmount || isPostQuote)) {
      const properties: Record<string, unknown> = {
        mm_pay_quote_requested: true,
      };

      if (amountChangeTimeRef.current > 0) {
        properties.mm_pay_time_to_request_quote_ms = Math.round(
          Date.now() - amountChangeTimeRef.current,
        );
      }

      setConfirmationMetric({ properties });
      setIsTokenAmountUpdated(false);
    }
  }, [
    hasSourceAmount,
    isPostQuote,
    isTokenAmountUpdated,
    setConfirmationMetric,
  ]);

  const effectiveCurrentAmountHuman = depositMaxHumanRef.current ?? amountHuman;
  const hasPrefetchedQuote =
    isAmountUpdateQuotePipelineEnabled &&
    prefetchedQuoteAmountHuman === effectiveCurrentAmountHuman &&
    prefetchedQuotePayTokenKey === payTokenKey;

  return {
    amountFiat,
    amountFiatDebounced,
    amountHuman,
    amountHumanDebounced,
    hasInput,
    hasPrefetchedQuote,
    isDepositPrefillEnabled: depositPrefill.enabled,
    isDepositPrefilled: depositPrefill.hasPrefilled,
    isDepositPrefillLoading: depositPrefill.isLoading,
    isInputChanged,
    isPrefillPending,
    updatePendingAmount,
    updatePendingAmountPercentage,
    updateTokenAmount,
  };
}

function useTokenBalance(tokenUsdRate: number | undefined) {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const transactionId = transactionMeta?.id ?? '';

  const { payToken } = useTransactionPayToken();

  const payTokenBalanceUsd = new BigNumber(
    payToken?.balanceUsd ?? 0,
  ).toNumber();

  const { data: predictBalanceHuman = 0 } = usePredictBalance();

  const predictBalanceUsd = tokenUsdRate
    ? new BigNumber(predictBalanceHuman ?? '0')
        .multipliedBy(tokenUsdRate)
        .toNumber()
    : 0;

  const { withdrawableMusd, withdrawableFiatRaw } = useMoneyAccountBalance();

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    const perpsState = Engine.context.PerpsController?.state;
    const withdrawableBalance = perpsState?.accountState?.withdrawableBalance;
    return withdrawableBalance ? parseFloat(withdrawableBalance) : 0;
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountWithdraw])
  ) {
    // Only vmUSD shares (converted via vault rate) are withdrawable through the
    // teller — bare mUSD in the account is not part of this flow.
    if (withdrawableMusd === undefined) {
      return 0;
    }
    return tokenUsdRate
      ? withdrawableMusd.multipliedBy(tokenUsdRate).toNumber()
      : 0;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    return predictBalanceUsd;
  }

  if (paymentOverride === PaymentOverride.MoneyAccount) {
    if (!withdrawableFiatRaw) {
      return 0;
    }
    // ROUND_DOWN to cents before Max/percentage math so we never set an
    // amount above the spendable withdrawable balance after display rounding.
    return new BigNumber(withdrawableFiatRaw)
      .decimalPlaces(2, BigNumber.ROUND_DOWN)
      .toNumber();
  }

  return payTokenBalanceUsd;
}
