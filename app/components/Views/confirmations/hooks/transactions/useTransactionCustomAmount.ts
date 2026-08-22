import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';
import {
  getTokenAddress,
  setMoneyAccountDepositMaxAtomic,
} from '../../utils/transaction-pay';
import { useParams } from '../../../../../util/navigation/navUtils';
import { debounce } from 'lodash';
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
} from '../pay/useTransactionPayData';
import { useMMPayFiatConfig } from '../pay/useMMPayFiatConfig';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import {
  getDepositPrefillAmountInputType,
  MM_PAY_AMOUNT_INPUT_PREFILL_PRESENTED_KEY,
  MM_PAY_AMOUNT_INPUT_TYPE_KEY,
  MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX,
} from '../../utils/pay-amount-input-metrics';
import { useDepositPrefillAmount } from './useDepositPrefillAmount';

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
  const hasSourceAmount = useTransactionPayHasSourceAmount();
  const isPostQuote = useTransactionPayIsPostQuote();
  const isQuoteLoading = useIsTransactionPayQuoteLoading();
  const quotesLastUpdated = useTransactionPayQuotesLastUpdated();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const [isTokenAmountUpdated, setIsTokenAmountUpdated] = useState(false);
  const [isPrefillPending, setIsPrefillPending] = useState(isAddMusdFlow);
  const hasPrefilled = useRef(false);
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
  const { balanceUsd } = useTransactionPayBalance({ currency });
  const { payToken } = useTransactionPayToken();
  const payTokenKey = `${payToken?.chainId ?? ''}:${
    payToken?.address.toLowerCase() ?? ''
  }`;

  useEffect(() => {
    userHasEditedRef.current = false;
    prefetchQuoteRequestRef.current = undefined;
    prefetchedQuoteAmountHumanRef.current = undefined;
    prefetchedQuotePayTokenKeyRef.current = undefined;
    setPrefetchedQuoteAmountHuman(undefined);
    setPrefetchedQuotePayTokenKey(undefined);
  }, [payToken?.address, payToken?.chainId]);

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
    // Money Account confirmations are always USD-denominated.
    currency: 'usd',
  });

  // The input field always displays the full amount the user is putting in
  // (their balance on Max), matching the withdraw flow. The net amount received
  // after fees is surfaced separately by the receive row (targetAmount.usd).
  const amountFiat = amountFiatState;

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

    const effectiveHuman = amountHumanDebounced;
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

      if (isMoneyAccountDeposit) {
        setMoneyAccountDepositMaxAtomic(transactionId, value);
      }
    },
    [isMoneyAccountDeposit, transactionId],
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

      userHasEditedRef.current = true;
      amountChangeTimeRef.current = Date.now();

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

      // Sub-cent / dust balances ROUND_DOWN to $0. Treat that like no balance
      // so Max does not arm auto-submit and strand the page on Loading.
      if (new BigNumber(newAmount).lte(0)) {
        return false;
      }

      lastAmountInputTypeRef.current = `${percentage}%`;
      amountChangeTimeRef.current = Date.now();

      setConfirmationMetric({
        properties: {
          mm_pay_amount_input_type: `${percentage}%`,
        },
      });

      // Always arm isMaxAmount on a full (100%) selection. TPC resolves the
      // correct source balance for every flow — including money-account deposit
      // max — via the getBalance callback (perps HyperLiquid, predict
      // Polymarket, money-account mUSD + vmUSD), so no per-transaction-type
      // exclusion or client-side full-precision override is needed here.
      if (percentage === 100) {
        setIsMax(true);
      } else if (isMaxAmount) {
        setIsMax(false);
      }

      setAmountFiat(newAmount);
      return true;
    },
    [balanceUsd, isMaxAmount, setIsMax, setConfirmationMetric],
  );

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
      // Uncapped percentage prefills go through the same Max/percentage path
      // as the keypad buttons so money-account Max gets isMaxAmount —
      // matching other Max deposits. Limit-capped amounts are not a true Max
      // and must use the literal value.
      if (
        depositPrefill.percentage !== undefined &&
        !depositPrefill.isLimitCapped
      ) {
        updatePendingAmountPercentage(depositPrefill.percentage);
      } else {
        setAmountFiat(depositPrefill.prefillAmount ?? '0');
      }

      // Prefill is not a keypad press — use prefilled_* so analytics can
      // distinguish automatic prefill from user Max / 50%. Sticky
      // prefill_presented survives later manual / % edits.
      const prefillInputType = getDepositPrefillAmountInputType({
        percentage: depositPrefill.percentage,
        isLimitCapped: depositPrefill.isLimitCapped,
      });
      lastAmountInputTypeRef.current = prefillInputType;
      setConfirmationMetric({
        properties: {
          [MM_PAY_AMOUNT_INPUT_TYPE_KEY]: prefillInputType,
          [MM_PAY_AMOUNT_INPUT_PREFILL_PRESENTED_KEY]: true,
        },
      });
    } else if (prevHasPrefilled.current) {
      setAmountFiat('0');
      if (isMaxAmount) {
        setIsMax(false);
      }
    }
    prevHasPrefilled.current = depositPrefill.hasPrefilled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositPrefill.hasPrefilled]);

  useEffect(() => {
    if (
      isAddMusdFlow &&
      balanceUsd &&
      balanceUsd > 0 &&
      !hasPrefilled.current
    ) {
      hasPrefilled.current = true;
      updatePendingAmountPercentage(100);
      lastAmountInputTypeRef.current = MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX;
      setConfirmationMetric({
        properties: {
          [MM_PAY_AMOUNT_INPUT_TYPE_KEY]:
            MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX,
          [MM_PAY_AMOUNT_INPUT_PREFILL_PRESENTED_KEY]: true,
        },
      });
      setIsPrefillPending(false);
    }
  }, [
    isAddMusdFlow,
    balanceUsd,
    setConfirmationMetric,
    updatePendingAmountPercentage,
  ]);

  const updateTokenAmount = useCallback(async () => {
    await updateTransactionPayAmount(amountHuman);
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

  const hasPrefetchedQuote =
    isAmountUpdateQuotePipelineEnabled &&
    prefetchedQuoteAmountHuman === amountHuman &&
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
