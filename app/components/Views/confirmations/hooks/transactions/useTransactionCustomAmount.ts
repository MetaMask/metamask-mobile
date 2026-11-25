import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectRelayAtomicMaxEnabled,
  selectRelayFixedSpread,
} from '../../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../../reducers';
import { isSubsidizedRoute } from '../../utils/relayFixedSpread';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import Logger from '../../../../../util/Logger';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useTransactionPayPrefetch } from '../pay/useTransactionPayPrefetch';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';
import { getTokenAddress } from '../../utils/transaction-pay';
import { useParams } from '../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../components/confirm/confirm-component';
import { debounce } from 'lodash';
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
import {
  DepositPrefillStatus,
  MIN_FIAT_AMOUNT,
  useDepositPrefillAmount,
} from './useDepositPrefillAmount';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../constants/confirmations';
import { decodePaymentTokenAssetId } from '../../../../../util/transactions/payment-token';
import {
  isLighterAccountCreationDeposit,
  LIGHTER_FIRST_DEPOSIT_CAP_PERCENTAGE,
} from '../../temp-lighter/lighter-usdc-deposit';

export const MAX_LENGTH = 28;
const DEBOUNCE_DELAY = 300;
const MAX_CLAMP_COMMIT_RETRIES = 3;
const CLAMP_RETRY_BACKOFF_MS = 500;

interface DepositPrefetchQuoteRequest {
  amountHuman: string;
  payTokenKey: string;
  isAmountPrepared: boolean;
  quoteBaseline: number | undefined;
  sawQuoteLoading: boolean;
}

/**
 * Amount clamping utilities for transaction custom amounts.
 */
class AmountCapHelper {
  /**
   * Clamps an amount to the first-deposit cap when this is a Lighter account
   * creation deposit. The cap leaves a gas buffer so approve-plus-deposit does
   * not consume the entire balance.
   *
   * @param amountFiat - Fiat amount to clamp.
   * @param balanceUsd - Current balance in USD (number, string, or undefined).
   * @param transactionMeta - Transaction metadata.
   * @returns Clamped amount, or the original amount if no cap applies.
   */
  static clampToFirstDepositCap(
    amountFiat: string,
    balanceUsd: number | string | undefined,
    transactionMeta: TransactionMeta | undefined,
  ): string {
    if (
      !balanceUsd ||
      !transactionMeta ||
      !isLighterAccountCreationDeposit(transactionMeta)
    ) {
      return amountFiat;
    }

    const amount = new BigNumber(amountFiat);
    const balance = new BigNumber(balanceUsd);
    const cap = balance
      .multipliedBy(LIGHTER_FIRST_DEPOSIT_CAP_PERCENTAGE)
      .dividedBy(100);

    if (amount.isGreaterThan(cap)) {
      return cap.decimalPlaces(2, BigNumber.ROUND_DOWN).toString(10);
    }

    return amountFiat;
  }
}

export function useTransactionCustomAmount({
  autoSelectFiatPayment,
  currency,
}: { autoSelectFiatPayment?: boolean; currency?: string } = {}) {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId, id: transactionId } = transactionMeta;

  const isMoneyAccountDeposit = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_DEPOSIT_TYPES,
  );
  const isAddMusdFlow =
    isMoneyAccountDeposit &&
    getMoneyAccountDepositIntent(transactionMeta?.batchId) === 'addMusd';

  const isMembershipSubscription = hasTransactionType(transactionMeta, [
    TransactionType.membershipSubscription,
  ]);
  const { amount: defaultAmount } = useParams<ConfirmationParams>();
  const [amountFiat, setAmountFiat] = useState(defaultAmount ?? '0');
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
  const relayFixedSpreadConfig = useSelector(selectRelayFixedSpread);
  const isAtomicMaxEnabled = useSelector((state: RootState) =>
    selectRelayAtomicMaxEnabled(state, transactionMeta),
  );
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const tokenAddress = getTokenAddress(transactionMeta);
  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId, currency);
  // Deposit/withdraw amounts are human mUSD and the input is already USD, so
  // the typed value is the mUSD amount. Converting through a market rate is
  // not just lossy, it disagrees with the background: the UI priced mUSD from
  // mainnet (withdraw) or vault-chain (deposit) market data while
  // TransactionPayController values the committed `requiredAssets` from the
  // vault chain's, and Total came out short of amount + fee by that spread.
  // The money account itself counts 1 mUSD as $1, so par is the figure every
  // other surface uses.
  const skipFiatRateConversion =
    isMoneyAccountDeposit || isMoneyAccountWithdraw;
  const { balanceUsd } = useTransactionPayBalance({ currency });
  const { payToken } = useTransactionPayToken();
  const payTokenKey = payToken?.assetId.toLowerCase() ?? '';
  const payTokenAsset = decodePaymentTokenAssetId(payToken);

  // A Perps provider switch replaces the confirmation with a new transaction,
  // while this screen stays mounted. The amount on screen, entered or
  // prefilled, must survive that, so once the transaction is replaced the
  // prefill below no longer overwrites or clears it. Declared before the
  // token-change effect so the ref exists when that effect reads it.
  const previousTransactionIdRef = useRef(transactionId);
  const keepAmountAfterReplacementRef = useRef(false);
  const pendingClampRef = useRef(false);
  const clampCommitInFlightRef = useRef(false);
  const targetClampedAmountRef = useRef<string | null>(null);
  const clampRetryAttemptsRef = useRef(0);
  const clampRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [clampRetryCounter, setClampRetryCounter] = useState(0);
  const [isClampCommitFailed, setIsClampCommitFailed] = useState(false);
  const ignoreNextAutomaticTokenChangeRef = useRef(false);

  const previousPayTokenKeyRef = useRef(payTokenKey);
  useEffect(() => {
    // Only reset when the pay token genuinely changes to a different token.
    // Becoming undefined (during transaction replacement) should not reset.
    const hasToken = Boolean(payTokenAsset?.address && payTokenAsset?.chainId);
    const isGenuineChange =
      hasToken && previousPayTokenKeyRef.current !== payTokenKey;

    if (isGenuineChange) {
      // After a replacement, automatic token selection picks a different token
      // (Hyperliquid on Arbitrum vs Lighter on mainnet). Ignore the first
      // automatic change to preserve the kept amount; clear on later user changes.
      if (ignoreNextAutomaticTokenChangeRef.current) {
        ignoreNextAutomaticTokenChangeRef.current = false;
      } else {
        userHasEditedRef.current = false;
        keepAmountAfterReplacementRef.current = false;
      }
      prefetchQuoteRequestRef.current = undefined;
      prefetchedQuoteAmountHumanRef.current = undefined;
      prefetchedQuotePayTokenKeyRef.current = undefined;
      setPrefetchedQuoteAmountHuman(undefined);
      setPrefetchedQuotePayTokenKey(undefined);
      previousPayTokenKeyRef.current = payTokenKey;
    }
  }, [payTokenAsset?.address, payTokenAsset?.chainId, payTokenKey]);

  const { enabled: isAmountPrefetchEnabled } = useTransactionPayPrefetch();
  const { updateTransactionPayAmount } = useUpdateTransactionPayAmount();

  const depositPrefill = useDepositPrefillAmount({ autoSelectFiatPayment });

  useEffect(() => {
    if (!isAmountPrefetchEnabled) {
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
  }, [isAmountPrefetchEnabled, isQuoteLoading, quotesLastUpdated]);

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

  const amountHuman = useMemo(
    () =>
      getAmountHumanFromFiat(amountFiat, tokenFiatRate, skipFiatRateConversion),
    [amountFiat, skipFiatRateConversion, tokenFiatRate],
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
    if (!isAmountPrefetchEnabled || amountHumanDebounced === '0') {
      return;
    }

    const isNewPrefetch =
      prefetchQuoteRequestRef.current?.amountHuman !== amountHumanDebounced ||
      prefetchQuoteRequestRef.current?.payTokenKey !== payTokenKey;
    if (isNewPrefetch) {
      prefetchQuoteRequestRef.current = {
        amountHuman: amountHumanDebounced,
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
    updateTransactionPayAmount(amountHumanDebounced).then(
      (isPublished) => {
        if (!isPublished) {
          return;
        }

        const prefetchRequest = prefetchQuoteRequestRef.current;
        if (
          isNewPrefetch &&
          prefetchRequest?.amountHuman === amountHumanDebounced &&
          prefetchRequest.payTokenKey === payTokenKey
        ) {
          prefetchRequest.isAmountPrepared = true;
          prefetchRequest.quoteBaseline = quotesLastUpdatedRef.current;
          prefetchRequest.sawQuoteLoading = isQuoteLoadingRef.current;
        }
      },
      () => {
        if (
          prefetchQuoteRequestRef.current?.amountHuman ===
            amountHumanDebounced &&
          prefetchQuoteRequestRef.current.payTokenKey === payTokenKey
        ) {
          prefetchQuoteRequestRef.current = undefined;
        }
      },
    );
  }, [
    amountHumanDebounced,
    isAmountPrefetchEnabled,
    payTokenKey,
    updateTransactionPayAmount,
  ]);

  const isFixedSpreadRoute = isSubsidizedRoute(
    relayFixedSpreadConfig,
    {
      chainId: payTokenAsset?.chainId ?? '',
      address: payTokenAsset?.address ?? '',
    },
    { chainId, address: tokenAddress ?? '' },
  );
  const shouldHintAtomicMax = isAtomicMaxEnabled && isFixedSpreadRoute;

  const setIsMax = useCallback(
    (value: boolean) => {
      const { TransactionPayController } = Engine.context;

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isMaxAmount = value;

        if (isMoneyAccountDeposit) {
          // Only hint atomic when Core enables it. Route configuration is
          // predictive; Core verifies the subsidy and re-quotes if needed.
          config.atomic = value && !shouldHintAtomicMax ? false : undefined;
        }
      });
    },
    [isMoneyAccountDeposit, transactionId, shouldHintAtomicMax],
  );

  useEffect(() => {
    if (!isMoneyAccountDeposit || !isMaxAmount) {
      return;
    }

    Engine.context.TransactionPayController.setTransactionConfig(
      transactionId,
      (config) => {
        config.atomic = shouldHintAtomicMax ? undefined : false;
      },
    );
  }, [shouldHintAtomicMax, isMaxAmount, isMoneyAccountDeposit, transactionId]);

  const updatePendingAmount = useCallback(
    (value: string) => {
      if (isMembershipSubscription) {
        return;
      }
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
      keepAmountAfterReplacementRef.current = false;
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
      isMembershipSubscription,
      isFiatBuyLimited,
      fiatMaxAmount,
      isMaxAmount,
      setIsMax,
      setConfirmationMetric,
    ],
  );

  const updatePendingAmountPercentage = useCallback(
    (percentage: number, inputType = `${percentage}%`): boolean => {
      if (isMembershipSubscription) {
        return false;
      }
      if (!balanceUsd) {
        // No balance to derive a percentage/Max amount from — signal the caller
        // that nothing was applied so it can avoid submitting the page.
        return false;
      }

      const rawAmount = new BigNumber(percentage)
        .dividedBy(100)
        .multipliedBy(balanceUsd);

      // Max keeps every digit so the sweep still encodes the whole balance.
      // Any smaller percentage applies the cents the input displays: the
      // input truncates to cents while Total prices the committed amount in
      // full, so sub-cent digits made Total a cent more than the amount plus
      // fee on screen. Round down so the amount never exceeds the share of
      // balance the user asked for.
      const appliedAmount =
        percentage === 100
          ? rawAmount
          : rawAmount.decimalPlaces(2, BigNumber.ROUND_DOWN);

      // Pad a lone decimal to cents (`500.1` -> `500.10`).
      // Anything more precise keeps every digit.
      const newAmount =
        appliedAmount.decimalPlaces() === 1
          ? appliedAmount.toFixed(2)
          : appliedAmount.toFixed();

      // Sub-cent dust renders as $0.00 and cannot produce a usable quote, so
      // treat it like no balance rather than arming auto-submit and stranding
      // the page on Loading. Checked against the raw amount because Max
      // deliberately applies it in full precision.
      if (rawAmount.lt(MIN_FIAT_AMOUNT)) {
        return false;
      }

      lastAmountInputTypeRef.current = inputType;
      amountChangeTimeRef.current = Date.now();

      setConfirmationMetric({
        properties: {
          mm_pay_amount_input_type: inputType,
        },
      });

      if (percentage === 100) {
        setIsMax(true);
      } else if (isMaxAmount) {
        setIsMax(false);
      }

      setAmountFiat(newAmount);
      return true;
    },
    [
      balanceUsd,
      isMaxAmount,
      isMembershipSubscription,
      setIsMax,
      setConfirmationMetric,
    ],
  );

  useEffect(() => {
    if (previousTransactionIdRef.current === transactionId) {
      return;
    }

    previousTransactionIdRef.current = transactionId;

    if (amountFiat !== '0') {
      keepAmountAfterReplacementRef.current = true;
      pendingClampRef.current = true;
      ignoreNextAutomaticTokenChangeRef.current = true;
    }
  }, [amountFiat, transactionId]);

  // Clamp the kept amount once per replacement, deferring until balanceUsd,
  // tokenFiatRate, and the new transactionMeta are all available. Once clamped
  // and committed, clear the pending flag so successive replacements can clamp
  // again. keepAmountAfterReplacementRef stays true until a genuine pay-token
  // change or manual edit clears it.
  useEffect(() => {
    if (
      !pendingClampRef.current ||
      amountFiat === '0' ||
      !balanceUsd ||
      !transactionMeta
    ) {
      return;
    }

    // Wait for tokenFiatRate (or skipFiatRateConversion) before proceeding, so
    // we don't commit a zero amount. The effect will retry when the rate loads.
    if (!tokenFiatRate && !skipFiatRateConversion) {
      return;
    }

    // Return early if a commit is already in flight to avoid clearing the
    // pending flag while the async update is still running.
    if (clampCommitInFlightRef.current) {
      return;
    }

    const clampedAmount = AmountCapHelper.clampToFirstDepositCap(
      amountFiat,
      balanceUsd,
      transactionMeta,
    );

    // Check if we need to clamp or retry a failed commit. The retry path
    // re-commits even when amountFiat already equals the target.
    const needsClamp = clampedAmount !== amountFiat;
    const needsRetry =
      targetClampedAmountRef.current !== null &&
      amountFiat === targetClampedAmountRef.current;

    if (needsClamp || needsRetry) {
      const targetAmount = needsRetry
        ? (targetClampedAmountRef.current ?? clampedAmount)
        : clampedAmount;

      if (needsClamp) {
        setAmountFiat(clampedAmount);
        targetClampedAmountRef.current = clampedAmount;
      }

      // Commit the clamped amount to the transaction so the deposit carries
      // the reduced value, not the original 100%.
      const clampedAmountHuman = getAmountHumanFromFiat(
        targetAmount,
        tokenFiatRate,
        skipFiatRateConversion,
      );

      clampCommitInFlightRef.current = true;

      const commitClampedAmount = async () => {
        try {
          await updateTransactionPayAmount(clampedAmountHuman);
          // Clear both flags and reset state only after success
          pendingClampRef.current = false;
          clampCommitInFlightRef.current = false;
          targetClampedAmountRef.current = null;
          clampRetryAttemptsRef.current = 0;
          setIsClampCommitFailed(false);
        } catch (error: unknown) {
          Logger.error(
            error as Error,
            'Failed to update transaction pay amount with clamped value',
          );
          clampCommitInFlightRef.current = false;

          // Check if we've hit the retry limit
          if (clampRetryAttemptsRef.current >= MAX_CLAMP_COMMIT_RETRIES) {
            // Stop retrying and surface the failure
            pendingClampRef.current = false;
            setIsClampCommitFailed(true);
            Logger.error(
              new Error('Clamp commit retry limit reached'),
              'Failed to commit clamped amount after retries',
            );
          } else {
            // Retry with backoff
            clampRetryAttemptsRef.current += 1;
            clampRetryTimeoutRef.current = setTimeout(() => {
              pendingClampRef.current = true;
              setClampRetryCounter((prev) => prev + 1);
            }, CLAMP_RETRY_BACKOFF_MS);
          }
        }
      };

      commitClampedAmount().catch((error: unknown) => {
        Logger.error(
          error as Error,
          'Unexpected error in clamp commit handler',
        );
      });
    } else if (!clampCommitInFlightRef.current) {
      // No clamp needed and no commit in flight; clear the pending flag
      pendingClampRef.current = false;
      targetClampedAmountRef.current = null;
    }
  }, [
    amountFiat,
    balanceUsd,
    skipFiatRateConversion,
    tokenFiatRate,
    transactionMeta,
    updateTransactionPayAmount,
    clampRetryCounter,
  ]);

  const isDepositPrefilled =
    depositPrefill.status === DepositPrefillStatus.Prefilled;
  const prevHasPrefilled = useRef(isDepositPrefilled);
  useEffect(() => {
    // Keep the original payment amount through token/account changes; prefill
    // readiness still triggers quote preparation in CustomAmountInfo.
    if (isMembershipSubscription) {
      return;
    }
    // Skip if the user has manually typed on the keypad — a transient
    // hasPrefilled toggle (from tokenKey changes) must not overwrite
    // their input. The ref resets when the pay token genuinely changes.
    if (userHasEditedRef.current || keepAmountAfterReplacementRef.current) {
      prevHasPrefilled.current = isDepositPrefilled;
      return;
    }
    // Apply when committed, or on the token-switch frame where the next
    // amount is already computed but `hasPrefilled` has not flipped true yet.
    // Clearing to $0 in that gap is what made the prefill disappear.
    if (isDepositPrefilled || depositPrefill.prefillAmount !== undefined) {
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
    prevHasPrefilled.current = isDepositPrefilled;
    // Re-run on token change so a new funded token applies immediately instead
    // of waiting for hasPrefilled to toggle. Same-token balance updates do not
    // change payTokenKey, so the one-shot prefill is preserved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositPrefilled, payTokenKey, isMembershipSubscription]);

  useEffect(() => {
    if (
      isAddMusdFlow &&
      !isMembershipSubscription &&
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
    isMembershipSubscription,
    balanceUsd,
    setConfirmationMetric,
    updatePendingAmountPercentage,
  ]);

  // Clean up retry timeout on unmount or transactionId change
  useEffect(
    () => () => {
      if (clampRetryTimeoutRef.current) {
        clearTimeout(clampRetryTimeoutRef.current);
        clampRetryTimeoutRef.current = null;
      }
    },
    [transactionId],
  );

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
    isAmountPrefetchEnabled &&
    prefetchedQuoteAmountHuman === amountHuman &&
    prefetchedQuotePayTokenKey === payTokenKey;

  return {
    amountFiat,
    amountFiatDebounced,
    amountHuman,
    amountHumanDebounced,
    hasInput,
    hasPrefetchedQuote,
    // Exposed so callers can tell a keypad the user is typing on apart from
    // one opened for them. Resets when the pay token changes.
    hasUserEditedAmountRef: userHasEditedRef,
    depositPrefillStatus: depositPrefill.status,
    isInputChanged,
    isPrefillPending,
    updatePendingAmount,
    updatePendingAmountPercentage,
    updateTokenAmount,
    isClampCommitPending:
      clampCommitInFlightRef.current || pendingClampRef.current,
    isClampCommitFailed,
  };
}

function getAmountHumanFromFiat(
  amountFiatValue: string,
  tokenFiatRate: number | undefined,
  skipFiatRateConversion: boolean,
): string {
  if (skipFiatRateConversion) {
    return amountFiatValue || '0';
  }

  return tokenFiatRate
    ? new BigNumber(amountFiatValue || '0')
        .dividedBy(tokenFiatRate)
        .toString(10)
    : '0';
}
