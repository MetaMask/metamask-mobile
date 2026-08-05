import React, {
  ReactNode,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import { BalanceProjection } from '../../../../../UI/Money/components/BalanceProjection';
import { PayWithRow, PayWithRowSkeleton } from '../../rows/pay-with-row';
import { PercentageRow } from '../../rows/percentage-row';
import {
  DepositKeyboard,
  DepositKeyboardSkeleton,
} from '../../deposit-keyboard';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
import useMMPayNavigation from '../../../hooks/ui/useMMPayNavigation';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useIsFiatPaymentAvailable } from '../../../hooks/pay/useIsFiatPaymentAvailable';
import { useTransactionPayPostQuote } from '../../../hooks/pay/useTransactionPayPostQuote';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import {
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPayQuotesLastUpdated,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../../../hooks/pay/useTransactionPayHasSourceAmount';
import { usePayWithMoneyAccountSection } from '../../../hooks/pay/sections/usePayWithMoneyAccountSection';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { strings } from '../../../../../../../locales/i18n';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  Box,
  HelpText,
  HelpTextSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import EngineService from '../../../../../../core/EngineService';
import Engine from '../../../../../../core/Engine';
import { getAmountUpdateErrorToastOptions } from '../../../../../../util/confirmation/transactions';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { prefixError } from '../../../../../../util/transactions/error-prefix';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useMoneyNoFeeTokens } from '../../../hooks/pay/useMoneyNoFeeTokens';
import PayAccountSelector from '../../PayAccountSelector';
import { AccountSelectorSkeleton } from '../../AccountSelector';
import { PerpsAccountPickerRow } from '../../rows/perps-account-picker-row';
import { PredictAccountPickerRow } from '../../rows/predict-account-picker-row';
import { useTransactionAccountOverride } from '../../../hooks/transactions/useTransactionAccountOverride';
import { CustomAmountInfoTestIds } from './custom-amount-info.testIds';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useFiatFunnelMetricsAdapter } from '../../../../../UI/Ramp/hooks/useFiatFunnelMetricsAdapter';
import { getMoneyAccountDepositIntent } from '../../../../../UI/Money/hooks/useMoneyAccount';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { typography } from '@metamask/design-tokens';
import { CustomAmountBuy } from '../../custom-amount/custom-amount-buy';
import { CustomAmountTotals } from '../../custom-amount/custom-amount-totals';
import { CustomAmountConfirmButton } from '../../custom-amount/custom-amount-confirm-button';
const AMOUNT_UPDATE_ERROR_PREFIX = 'MetaMask Pay: Amount Update: ';
/** Reserve up to two BodySm lines so HelpText appearance does not shift the amount block. */
const HELP_TEXT_SLOT_MIN_HEIGHT = typography.sBodySM.lineHeight * 2;

type QuoteHandoff =
  | {
      kind: 'loading';
      quotesLastUpdated: number | undefined;
    }
  | {
      kind: 'completed';
      quotesLastUpdated: number;
    };

function getLatestQuotesLastUpdated(
  controllerQuotesLastUpdated: number | undefined,
  reduxQuotesLastUpdated: number | undefined,
) {
  if (controllerQuotesLastUpdated === undefined) {
    return reduxQuotesLastUpdated;
  }

  if (reduxQuotesLastUpdated === undefined) {
    return controllerQuotesLastUpdated;
  }

  return Math.max(controllerQuotesLastUpdated, reduxQuotesLastUpdated);
}

export interface CustomAmountInfoProps {
  autoSelectFiatPayment?: boolean;
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
  hasMax?: boolean;
  hideAccountSelector?: boolean;
  preferredToken?: SetPayTokenRequest;
  footerText?: string;
  /**
   * When true, hides the default PayTokenAmount below the fiat amount.
   */
  hidePayTokenAmount?: boolean;
  /**
   * Callback fired when user presses Done after entering an amount.
   */
  onAmountSubmit?: () => void;
  /**
   * When true, the confirm/continue button is disabled regardless of alert state.
   */
  disableConfirm?: boolean;
  /**
   * When true, the account selector is shown.
   */
  supportAccountSelection?: boolean;
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({
    autoSelectFiatPayment,
    children,
    currency,
    disableConfirm,
    disablePay,
    hasMax,
    hideAccountSelector,
    onAmountSubmit,
    hidePayTokenAmount,
    preferredToken,
    footerText,
    supportAccountSelection,
  }) => {
    const transactionMeta = useTransactionMetadataRequest();
    const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
    ]);
    const isAddMusdIntent =
      isMoneyAccountDeposit &&
      getMoneyAccountDepositIntent(transactionMeta?.batchId) === 'addMusd';

    useClearConfirmationOnBackSwipe();

    const { canSelectWithdrawToken } = useTransactionPayWithdraw();

    useAutomaticTransactionPayToken({
      autoSelectFiatPayment,
      disable: disablePay,
      preferredToken,
    });
    useTransactionPayMetrics();
    useTransactionPayPostQuote(); // Set isPostQuote=true for post-quote transactions

    // TRAM-3623 headless ramps funnel. The adapter owns screen-viewed tracking
    // and derives ramp_surface from the tx type, so non-money flows stay inert.
    const { trackAmountCommitted, trackContinue } =
      useFiatFunnelMetricsAdapter();

    const { isNative: isNativePayToken, payToken } = useTransactionPayToken();
    const { isMoneyNoFeeToken: isMoneyDepositNoFee } = useMoneyNoFeeTokens();

    const {
      amountFiat,
      amountFiatDebounced,
      amountHuman,
      amountHumanDebounced,
      hasInput,
      isDepositPrefillEnabled,
      isDepositPrefilled,
      isDepositPrefillLoading,
      isInputChanged,
      isPrefillPending,
      updatePendingAmount,
      updatePendingAmountPercentage,
      updateTokenAmount,
    } = useTransactionCustomAmount({ currency });

    const { hasTokens: hasAvailableTokens } =
      useTransactionPayAvailableTokens();
    const fiatPayment = useTransactionPayFiatPayment();
    const selectedFiatPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

    // Fiat was selected (explicitly or because no crypto tokens are available)
    // with no crypto pay token — deposit prefill has nothing to prefill from.
    const skipDepositPrefill =
      Boolean(autoSelectFiatPayment) ||
      (Boolean(selectedFiatPaymentMethodId) && !payToken) ||
      (!hasAvailableTokens && !payToken);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(
      !isAddMusdIntent && (!isDepositPrefillEnabled || skipDepositPrefill),
    );
    const isKeyboardVisibleRef = useRef(isKeyboardVisible);
    isKeyboardVisibleRef.current = isKeyboardVisible;
    const [isAmountUpdating, setIsAmountUpdating] = useState(false);
    const [hasCommittedAmount, setHasCommittedAmount] = useState(false);
    const [quoteHandoff, setQuoteHandoff] = useState<QuoteHandoff>();
    // React batches rapid presses before the state update rerenders, so keep a
    // synchronous guard separate from the render state.
    const isAmountUpdateInProgressRef = useRef(false);
    const quotesLastUpdatedRef = useRef<number | undefined>(undefined);
    const stage = isKeyboardVisible
      ? CustomAmountStage.AmountInput
      : CustomAmountStage.ShowTotals;
    const reopenAmountInput = useCallback(() => {
      setHasCommittedAmount(false);
      setIsKeyboardVisible(true);
    }, []);
    const setStage = useCallback(
      (
        updater:
          | CustomAmountStage
          | null
          | ((prev: CustomAmountStage | null) => CustomAmountStage | null),
      ) => {
        const prevKeyboard = isKeyboardVisibleRef.current;
        const prevStage = prevKeyboard
          ? CustomAmountStage.AmountInput
          : CustomAmountStage.ShowTotals;
        const next =
          typeof updater === 'function' ? updater(prevStage) : updater;
        if (next === CustomAmountStage.AmountInput) {
          reopenAmountInput();
          return;
        }
        setIsKeyboardVisible(false);
      },
      [reopenAmountInput],
    );
    useMMPayNavigation(stage, setStage);
    const isFiatAvailable = useIsFiatPaymentAvailable();
    const moneyAccountSection = usePayWithMoneyAccountSection();
    const hasPaymentOption =
      hasAvailableTokens || isFiatAvailable || moneyAccountSection !== null;
    const fiatEverSelectedRef = useRef(false);
    if (selectedFiatPaymentMethodId) {
      fiatEverSelectedRef.current = true;
    }

    useEffect(() => {
      if (isDepositPrefillEnabled && skipDepositPrefill && !isKeyboardVisible) {
        setIsKeyboardVisible(true);
      }
    }, [isDepositPrefillEnabled, skipDepositPrefill, isKeyboardVisible]);

    const shouldHideAccountSelector =
      hideAccountSelector && !fiatEverSelectedRef.current;
    const transactionId = transactionMeta?.id;
    const accountOverride = useTransactionAccountOverride();
    const isWithdraw = isTransactionPayWithdraw(transactionMeta);

    const { toastRef } = useContext(ToastContext);

    const isTransactionResultReady = useIsResultReady({ isKeyboardVisible });
    const quotes = useTransactionPayQuotes();
    const quotesLastUpdated = useTransactionPayQuotesLastUpdated();
    quotesLastUpdatedRef.current = quotesLastUpdated;
    const isQuotesLoading = useIsTransactionPayLoading();
    const hasSourceAmount = useTransactionPayHasSourceAmount();
    const showLoadingReview =
      !isKeyboardVisible &&
      (isAmountUpdating || (isQuotesLoading && hasCommittedAmount));
    const isResultReady =
      showLoadingReview ||
      isTransactionResultReady ||
      (isAddMusdIntent && !isKeyboardVisible);
    const { alerts } = useAlerts();
    const accountNoFundsAlert = useAccountNoFundsAlert();
    const hasAccountNoFunds = accountNoFundsAlert.length > 0;
    const hasNoQuotesAlert = alerts.some(
      (a) => a.key === AlertKeys.NoPayTokenQuotes,
    );

    const isAwaitingPrefillResult =
      !hasAccountNoFunds && !skipDepositPrefill && isDepositPrefillLoading;

    const { helpText, hasBlockingError } = useTransactionCustomAmountAlerts({
      isInputChanged,
      isKeyboardVisible,
      pendingTokenAmount: amountHumanDebounced,
      pendingFiatAmount: amountFiatDebounced,
    });

    const { headlessBuyError } = useConfirmationContext();

    const isAccountSelectionNeeded =
      supportAccountSelection && !accountOverride;
    const hideDetailsForNoFunds = hasAccountNoFunds && Boolean(accountOverride);
    const hideBuyForNoFunds =
      Boolean(accountOverride) &&
      (hasAccountNoFunds || isQuotesLoading || isAmountUpdating);

    const hidePercentageButtons =
      Boolean(selectedFiatPaymentMethodId) || shouldHideAccountSelector;

    const showPaymentDetails =
      showLoadingReview ||
      Boolean(quotes?.length) ||
      (!isAddMusdIntent && !hasSourceAmount && !hasNoQuotesAlert);

    const showBuySection =
      (!hasPaymentOption || hasAccountNoFunds) &&
      !hideBuyForNoFunds &&
      !isDepositPrefillEnabled;

    const buyEmptyHelpText = getBuyEmptyHelpText(transactionMeta);
    const resolvedHelpText =
      (showBuySection ? buyEmptyHelpText : undefined) ??
      helpText ??
      headlessBuyError;
    const hasBlockingErrorEffective =
      Boolean(resolvedHelpText) || hasBlockingError;
    const hideConfirm = Boolean(showBuySection && buyEmptyHelpText);
    const disableConfirmEffective =
      disableConfirm ||
      isAccountSelectionNeeded ||
      isPrefillPending ||
      isAwaitingPrefillResult ||
      hasBlockingErrorEffective ||
      !isResultReady ||
      showLoadingReview;

    const showLiveAccountSelector =
      Boolean(supportAccountSelection) &&
      !selectedFiatPaymentMethodId &&
      !shouldHideAccountSelector;

    const hasAutoSubmittedPrefill = useRef(false);

    const handleDone = useCallback(async () => {
      const keyboardVisibleAtStart = isKeyboardVisibleRef.current;
      if (isAmountUpdateInProgressRef.current) {
        return;
      }

      isAmountUpdateInProgressRef.current = true;
      setQuoteHandoff(undefined);
      setIsAmountUpdating(true);
      setIsKeyboardVisible(false);

      try {
        await updateTokenAmount();
        setHasCommittedAmount(true);
        if (selectedFiatPaymentMethodId && transactionId) {
          Engine.context.TransactionPayController.updateFiatPayment({
            transactionId,
            callback: (fp) => {
              fp.amountFiat = amountFiat;
            },
          });
        }
        // Amount committed (pre-quote) funnel event; only fires once the amount
        // has been successfully applied above (no-op for non-money flows).
        trackAmountCommitted();

        const transactionData = transactionId
          ? Engine.context.TransactionPayController.state.transactionData[
              transactionId
            ]
          : undefined;
        const controllerQuotesLastUpdated = transactionData?.quotesLastUpdated;
        const latestQuotesLastUpdated = getLatestQuotesLastUpdated(
          controllerQuotesLastUpdated,
          quotesLastUpdatedRef.current,
        );

        if (transactionData?.isLoading) {
          setQuoteHandoff({
            kind: 'loading',
            quotesLastUpdated: latestQuotesLastUpdated,
          });
        } else if (
          controllerQuotesLastUpdated !== undefined &&
          controllerQuotesLastUpdated !== quotesLastUpdatedRef.current
        ) {
          setQuoteHandoff({
            kind: 'completed',
            quotesLastUpdated: controllerQuotesLastUpdated,
          });
        } else {
          setQuoteHandoff(undefined);
          setIsAmountUpdating(false);
        }
      } catch (error) {
        const isConfirmationDismissed =
          !Engine.context.TransactionController.state.transactions.some(
            (tx) => tx.id === transactionId,
          );
        if (isConfirmationDismissed) {
          return;
        }
        const prefixed = prefixError(error, AMOUNT_UPDATE_ERROR_PREFIX);
        toastRef?.current?.showToast(
          getAmountUpdateErrorToastOptions(prefixed, () =>
            toastRef?.current?.closeToast(),
          ),
        );
        setIsKeyboardVisible(true);
        setHasCommittedAmount(false);
        setQuoteHandoff(undefined);
        setIsAmountUpdating(false);
        // Keep keyboard visible so the user can retry; do not advance the flow.
        return;
      } finally {
        isAmountUpdateInProgressRef.current = false;
      }
      EngineService.flushState();
      hasAutoSubmittedPrefill.current = true;
      // If the keyboard was closed when handleDone started (auto-submit) but
      // the user opened it during the await, don't dismiss it.
      if (!keyboardVisibleAtStart && isKeyboardVisibleRef.current) {
        return;
      }
      setIsKeyboardVisible(false);
      onAmountSubmit?.();
    }, [
      amountFiat,
      onAmountSubmit,
      selectedFiatPaymentMethodId,
      toastRef,
      trackAmountCommitted,
      transactionId,
      updateTokenAmount,
    ]);

    useEffect(() => {
      if (!quoteHandoff) {
        return;
      }

      const hasQuotes = Boolean(quotes?.length);
      const hasObservedLoading =
        quoteHandoff.kind === 'loading' && isQuotesLoading;
      const hasObservedCompletedQuote =
        quotesLastUpdated !== undefined &&
        (quoteHandoff.kind === 'completed'
          ? quotesLastUpdated >= quoteHandoff.quotesLastUpdated
          : hasQuotes &&
            (quoteHandoff.quotesLastUpdated === undefined ||
              quotesLastUpdated > quoteHandoff.quotesLastUpdated));

      // Loading can finish before Redux ever sees isLoading:true. In that case
      // neither hasObservedLoading nor a strictly-newer timestamp fires, so
      // confirm the controller has settled and Redux has at least the baseline.
      const controllerTransactionData =
        transactionId === undefined
          ? undefined
          : Engine.context.TransactionPayController.state.transactionData[
              transactionId
            ];
      const hasSettledWithoutObservedLoading =
        quoteHandoff.kind === 'loading' &&
        !isQuotesLoading &&
        controllerTransactionData !== undefined &&
        !controllerTransactionData.isLoading &&
        (quoteHandoff.quotesLastUpdated === undefined ||
          (quotesLastUpdated !== undefined &&
            quotesLastUpdated >= quoteHandoff.quotesLastUpdated));

      if (
        hasObservedLoading ||
        hasObservedCompletedQuote ||
        hasSettledWithoutObservedLoading
      ) {
        setQuoteHandoff(undefined);
        setIsAmountUpdating(false);
      }
    }, [
      isQuotesLoading,
      quoteHandoff,
      quotes,
      quotesLastUpdated,
      transactionId,
    ]);

    const wasPrefillPending = useRef(isPrefillPending);
    useEffect(() => {
      if (wasPrefillPending.current && !isPrefillPending) {
        handleDone();
      }
      wasPrefillPending.current = isPrefillPending;
    }, [isPrefillPending, handleDone]);

    useEffect(() => {
      // Reset when prefill drops (e.g. pay token changed) so handleDone
      // re-fires once the new prefill amount is ready.
      if (!isDepositPrefilled) {
        hasAutoSubmittedPrefill.current = false;
        return;
      }

      // Never auto-submit while the user is actively editing on the keyboard.
      // The tokenKey in useDepositPrefillAmount can toggle hasPrefilled
      // (true → false → true) during background state changes, which resets
      // the guard above and would otherwise dismiss the keyboard mid-edit.
      if (isKeyboardVisible) {
        return;
      }

      if (!hasAutoSubmittedPrefill.current && amountFiat !== '0') {
        hasAutoSubmittedPrefill.current = true;
        handleDone();
      }
    }, [isDepositPrefilled, amountFiat, handleDone, isKeyboardVisible]);

    // State (not a ref) so pressing Max re-runs the effect even when amountFiat
    // is unchanged (already at max) — a ref alone would never clear loading.
    const [isMaxAutoSubmitPending, setIsMaxAutoSubmitPending] = useState(false);

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        const didApplyAmount = updatePendingAmountPercentage(percentage);
        // Max must not submit the page when there is no balance to deposit /
        // withdraw — the amount stays $0, so leave the keyboard open instead of
        // stranding the user on a loading screen.
        if (percentage === 100 && didApplyAmount) {
          setIsMaxAutoSubmitPending(true);
          // Max defers the commit until amountFiat lands; show the loading
          // review through that gap so Confirm cannot be tapped early.
          setIsAmountUpdating(true);
          setIsKeyboardVisible(false);
        }
      },
      [updatePendingAmountPercentage],
    );

    useEffect(() => {
      if (isMaxAutoSubmitPending && amountFiat !== '0') {
        setIsMaxAutoSubmitPending(false);
        handleDone();
      }
    }, [amountFiat, handleDone, isMaxAutoSubmitPending]);

    const handleAmountPress = reopenAmountInput;

    return (
      <Box twClassName="flex-1 flex-col justify-between">
        <Box twClassName="flex-1 justify-center items-center gap-3.5">
          <Box twClassName="w-full items-center gap-2">
            <CustomAmount
              amountFiat={amountFiat}
              currency={currency}
              hasAlert={Boolean(resolvedHelpText)}
              isLoading={
                !hasAccountNoFunds &&
                !skipDepositPrefill &&
                (isPrefillPending || isDepositPrefillLoading)
              }
              onPress={showLoadingReview ? undefined : handleAmountPress}
              disabled={!hasPaymentOption}
              showCursor={isKeyboardVisible && !showLoadingReview}
            />
            <Box
              twClassName="w-full px-4 items-center justify-center"
              style={{ minHeight: HELP_TEXT_SLOT_MIN_HEIGHT }}
              testID={CustomAmountInfoTestIds.HELP_TEXT}
            >
              {resolvedHelpText ? (
                <HelpText
                  severity={HelpTextSeverity.Danger}
                  twClassName="text-center"
                >
                  {resolvedHelpText}
                </HelpText>
              ) : null}
            </Box>
          </Box>
          {!hidePayTokenAmount &&
            disablePay !== true &&
            (isMoneyAccountDeposit ? (
              <BalanceProjection amountFiat={amountFiat} projectedYears={1} />
            ) : (
              <PayTokenAmount
                amountHuman={amountHuman}
                disabled={!hasPaymentOption || isAccountSelectionNeeded}
              />
            ))}
          {!hidePayTokenAmount && children}
        </Box>
        <Box
          gap={4}
          testID={CustomAmountInfoTestIds.BOTTOM_BLOCK}
          twClassName={Platform.OS === 'android' ? 'pb-4' : 'pb-0'}
        >
          {!isResultReady && !(isKeyboardVisible && isAddMusdIntent) && (
            <>
              {showLiveAccountSelector && (
                <Box twClassName="border-b border-muted mb-[-4px]">
                  <PayAccountSelector />
                </Box>
              )}
              <PerpsAccountPickerRow />
              <PredictAccountPickerRow />
              {disablePay !== true &&
                (hasPaymentOption || hasAccountNoFunds) && <PayWithRow />}
            </>
          )}
          {isResultReady && (
            <View
              pointerEvents={showLoadingReview ? 'none' : 'auto'}
              testID={CustomAmountInfoTestIds.REVIEW_ROWS}
            >
              {showLiveAccountSelector && <PayAccountSelector />}
              <PerpsAccountPickerRow />
              <PredictAccountPickerRow />
              {disablePay !== true && hasPaymentOption && (
                <PayWithRow isResultReady />
              )}
              {!hideDetailsForNoFunds && !hasAccountNoFunds && (
                <CustomAmountTotals
                  amountFiat={amountFiat}
                  canSelectWithdrawToken={canSelectWithdrawToken}
                  isAddMusdIntent={isAddMusdIntent}
                  isAwaitingPrefillResult={isAwaitingPrefillResult}
                  isLoading={showLoadingReview}
                  showPaymentDetails={showPaymentDetails}
                />
              )}
              <PercentageRow />
            </View>
          )}
          {footerText && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="self-center px-4"
            >
              {footerText}
            </Text>
          )}
          {isKeyboardVisible &&
            !(showBuySection && buyEmptyHelpText) &&
            (hasPaymentOption || hasAccountNoFunds) && (
              <Box twClassName="px-4">
                <DepositKeyboard
                  hidePercentageButtons={hidePercentageButtons}
                  isDoneDisabled={hasBlockingErrorEffective}
                  value={amountFiat}
                  onChange={updatePendingAmount}
                  onDonePress={handleDone}
                  onPercentagePress={handlePercentagePress}
                  hasInput={hasInput}
                  hasMax={
                    (hasMax || isMoneyDepositNoFee) &&
                    (isWithdraw || !isNativePayToken)
                  }
                />
              </Box>
            )}
          {showBuySection ? (
            <Box twClassName="px-4">
              <CustomAmountBuy />
            </Box>
          ) : null}
          {!isKeyboardVisible && !hideConfirm && (
            <Box twClassName="px-4">
              <CustomAmountConfirmButton
                disableConfirm={disableConfirmEffective}
                isAmountUpdating={isAmountUpdating}
                onContinue={trackContinue}
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  return (
    <Box twClassName="flex-1 flex-col justify-between">
      <Box twClassName="flex-1 justify-center items-center gap-3.5">
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
      </Box>
      <Box>
        <PayWithRowSkeleton />
        <Box twClassName="px-4">
          <DepositKeyboardSkeleton />
        </Box>
      </Box>
    </Box>
  );
}

export function PrefillCustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID="prefill-custom-amount-info-skeleton">
      <View style={styles.inputContainer}>
        <CustomAmountSkeleton />
        <Skeleton height={20} width={200} />
      </View>
      <View>
        <View style={styles.skeletonRow}>
          <Skeleton height={18} width={100} />
          <View style={styles.skeletonRowRight}>
            <Skeleton height={28} width={28} twClassName="rounded-full" />
            <Skeleton height={18} width={100} />
          </View>
        </View>
        <View style={styles.skeletonInfoRow}>
          <Skeleton height={18} width={100} />
          <View style={styles.skeletonRowRight}>
            <Skeleton height={24} width={24} twClassName="rounded-full" />
            <Skeleton height={18} width={100} />
          </View>
        </View>
        <View style={styles.skeletonInfoRow}>
          <Skeleton height={16} width={100} />
          <Skeleton height={16} width={100} />
        </View>
        <View style={styles.skeletonInfoRow}>
          <Skeleton height={16} width={100} />
          <Skeleton height={16} width={100} />
        </View>
        <View style={styles.skeletonInfoRow}>
          <Skeleton height={16} width={100} />
          <Skeleton height={16} width={100} />
        </View>
        <Skeleton height={48} style={styles.buttonSkeleton} />
      </View>
    </View>
  );
}

export function AdvancedCustomAmountInfoSkeleton() {
  const params = useParams<ConfirmationParams>();
  // Fiat flows never render the account selector or pay-with rows while the
  // keyboard is up, so their skeletons would cause a layout shift on load.
  const hideAccountRows = Boolean(params?.autoSelectFiatPayment);

  return (
    <Box
      twClassName="flex-1 flex-col justify-between"
      testID="advanced-custom-amount-info-skeleton"
    >
      <Box twClassName="flex-1 justify-center items-center gap-3.5">
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
      </Box>
      <Box>
        {!hideAccountRows && (
          <>
            <AccountSelectorSkeleton />
            <PayWithRowSkeleton />
          </>
        )}
        <Box twClassName="px-4">
          <DepositKeyboardSkeleton />
        </Box>
      </Box>
    </Box>
  );
}

function getBuyEmptyHelpText(
  transactionMeta: ReturnType<typeof useTransactionMetadataRequest>,
): string | undefined {
  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    return strings('confirm.custom_amount.buy_perps');
  }
  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return strings('confirm.custom_amount.buy_predict');
  }
  return undefined;
}

function useIsResultReady({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const hasSourceAmount = useTransactionPayHasSourceAmount();

  return (
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || !hasSourceAmount)
  );
}
