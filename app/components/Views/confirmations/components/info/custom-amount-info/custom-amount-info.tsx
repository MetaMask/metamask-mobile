import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { AlertMessage } from '../../alerts/alert-message';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import { BalanceProjection } from '../../../../../UI/Money/components/BalanceProjection';
import { MembershipInfo } from '../../../external/subscriptions/components/membership-info';
import { useConfirmationFirstFrame } from '../../../context/confirmation-first-frame-context';
import { PayWithRow, PayWithRowSkeleton } from '../../rows/pay-with-row';
import {
  DepositKeyboard,
  DepositKeyboardSkeleton,
} from '../../deposit-keyboard';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { DepositPrefillStatus } from '../../../hooks/transactions/useDepositPrefillAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import {
  CustomAmountStage,
  useCustomAmountStage,
} from '../../../hooks/custom-amount/useCustomAmountStage';
import useMMPayNavigation from '../../../hooks/ui/useMMPayNavigation';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useIsFiatPaymentAvailable } from '../../../hooks/pay/useIsFiatPaymentAvailable';
import { useTransactionPayPostQuote } from '../../../hooks/pay/useTransactionPayPostQuote';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import { useTransactionPayFiatPayment } from '../../../hooks/pay/useTransactionPayData';
import { usePayWithMoneyAccountSection } from '../../../hooks/pay/sections/usePayWithMoneyAccountSection';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useTransactionPayAccountLoading } from '../../../hooks/pay/useTransactionPayAccountLoading';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import EngineService from '../../../../../../core/EngineService';
import Engine from '../../../../../../core/Engine';
import { getAmountUpdateErrorToastOptions } from '../../../../../../util/confirmation/transactions';
import { prefixError } from '../../../../../../util/transactions/error-prefix';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useMoneyNoFeeTokens } from '../../../hooks/pay/useMoneyNoFeeTokens';
import PayAccountSelector from '../../PayAccountSelector';
import { AccountSelectorSkeleton } from '../../AccountSelector';
import { PerpsAccountPickerRow } from '../../rows/perps-account-picker-row';
import { DepositToRow } from '../../rows/deposit-to-row';
import { MoneyDepositToRow } from '../../rows/money-deposit-to-row';
import {
  PerpsReceiveToRow,
  type PerpsReceiveDestination,
} from '../../rows/perps-receive-to-row';
import {
  PerpsWithdrawFromRow,
  type PerpsWithdrawSource,
} from '../../rows/perps-withdraw-from-row';
import { PredictAccountPickerRow } from '../../rows/predict-account-picker-row';
import { useTransactionAccountOverride } from '../../../hooks/transactions/useTransactionAccountOverride';
import { useSyncPerpsLighterTransactionType } from '../../../hooks/transactions/useSyncPerpsLighterTransactionType';
import { perpsProviderSelectionForType } from '../../../utils/perps-lighter-transaction-type';
import { CustomAmountInfoTestIds } from './custom-amount-info.testIds';
import {
  MM_PAY_AMOUNT_INPUT_TYPE_MANUAL_SNAPPED_MAX,
  useSnapAmountToMax,
} from '../../../hooks/custom-amount/useSnapAmountToMax';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useFiatFunnelMetricsAdapter } from '../../../../../UI/Ramp/hooks/useFiatFunnelMetricsAdapter';
import {
  getMoneyAccountDepositIntent,
  isFullBalanceDepositIntent,
} from '../../../../../UI/Money/hooks/useMoneyAccount';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import {
  CustomAmountBuy,
  getBuyMessage,
} from '../../custom-amount/custom-amount-buy';
import { CustomAmountTotals } from '../../custom-amount/custom-amount-totals';
import { CustomAmountConfirmButton } from '../../custom-amount/custom-amount-confirm-button';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
  toast,
} from '@metamask/design-system-react-native';

const AMOUNT_UPDATE_ERROR_PREFIX = 'MetaMask Pay: Amount Update: ';

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
    const { headlessBuyError, setPendingFiatAmount } = useConfirmationContext();
    const transactionMeta = useTransactionMetadataRequest();
    const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
    ]);
    const isFullBalanceMoneyDeposit =
      isMoneyAccountDeposit &&
      isFullBalanceDepositIntent(
        getMoneyAccountDepositIntent(transactionMeta?.batchId),
      );

    useClearConfirmationOnBackSwipe();

    // Undefined when the confirmation renders everything immediately.
    const firstFrame = useConfirmationFirstFrame();
    const isDeferredInitReady = !firstFrame || firstFrame.isFirstFrameComplete;

    // TRAM-3623 headless ramps funnel. The adapter owns screen-viewed tracking
    // and derives ramp_surface from the tx type, so non-money flows stay inert.
    const { trackAmountCommitted, trackContinue } =
      useFiatFunnelMetricsAdapter();

    const { isNative: isNativePayToken, payToken } = useTransactionPayToken();
    const { isMoneyNoFeeToken: isMoneyDepositNoFee } = useMoneyNoFeeTokens();
    const { styles } = useStyles(styleSheet, {});
    const isMembershipSubscription = hasTransactionType(transactionMeta, [
      TransactionType.membershipSubscription,
    ]);

    const {
      amountFiat,
      amountFiatDebounced,
      amountHuman,
      depositPrefillStatus,
      hasInput,
      hasPrefetchedQuote,
      hasUserEditedAmountRef,
      isInputChanged,
      isPrefillPending,
      updatePendingAmount,
      updatePendingAmountPercentage,
      updateTokenAmount,
    } = useTransactionCustomAmount({ autoSelectFiatPayment, currency });

    const { hasTokens: hasAvailableTokens } =
      useTransactionPayAvailableTokens();
    const fiatPayment = useTransactionPayFiatPayment();
    const selectedFiatPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
    const isDepositPrefillEnabled =
      depositPrefillStatus !== DepositPrefillStatus.Disabled;
    const isDepositPrefilled =
      depositPrefillStatus === DepositPrefillStatus.Prefilled;
    const isDepositPrefillLoading =
      depositPrefillStatus === DepositPrefillStatus.Loading;
    const skipDepositPrefill =
      depositPrefillStatus === DepositPrefillStatus.Skipped;

    const accountNoFundsAlert = useAccountNoFundsAlert();
    const hasAccountNoFunds = accountNoFundsAlert.length > 0;

    const {
      isAmountUpdating,
      stage: amountStage,
      setStage,
    } = useCustomAmountStage({
      amountFiat,
      disablePay,
      hasAccountNoFunds,
      hasPrefetchedQuote,
      isFullBalanceMoneyDeposit,
      isDepositPrefillEnabled,
      isDepositPrefillLoading,
      skipDepositPrefill,
    });
    // A fixed membership payment never opens amount entry, including on errors
    // or when the selected funding source cannot cover the payment.
    const stage =
      isMembershipSubscription && amountStage === CustomAmountStage.AmountInput
        ? CustomAmountStage.NoQuote
        : amountStage;

    const perpsProvider = perpsProviderSelectionForType(transactionMeta?.type);
    const [perpsReceiveDestination, setPerpsReceiveDestination] =
      useState<PerpsReceiveDestination>(perpsProvider);
    const [perpsWithdrawSource, setPerpsWithdrawSource] =
      useState<PerpsWithdrawSource>(perpsProvider);
    useSyncPerpsLighterTransactionType({
      destination: perpsReceiveDestination,
      source: perpsWithdrawSource,
    });

    // React batches rapid presses before the state update rerenders, so keep a
    // synchronous guard separate from the render state.
    const isAmountUpdateInProgressRef = useRef(false);
    useMMPayNavigation(stage, setStage, isMembershipSubscription);
    const isFiatAvailable = useIsFiatPaymentAvailable();
    const moneyAccountSection = usePayWithMoneyAccountSection();
    const hasPaymentOption =
      hasAvailableTokens || isFiatAvailable || moneyAccountSection !== null;
    const fiatEverSelectedRef = useRef(false);
    if (selectedFiatPaymentMethodId) {
      fiatEverSelectedRef.current = true;
    }

    const shouldHideAccountSelector =
      hideAccountSelector && !fiatEverSelectedRef.current;
    const transactionId = transactionMeta?.id;
    const accountOverride = useTransactionAccountOverride();
    const isWithdraw = isTransactionPayWithdraw(transactionMeta);
    const isPayAccountLoading = useTransactionPayAccountLoading();

    const isMaxAvailable =
      (hasMax || isMoneyDepositNoFee) &&
      (isWithdraw || !isNativePayToken) &&
      !selectedFiatPaymentMethodId &&
      !shouldHideAccountSelector;

    const { isSnapToMax, resolveAmountFiat } = useSnapAmountToMax({
      isMaxAvailable,
    });

    const pendingFiatAmount = resolveAmountFiat(amountFiatDebounced);

    // Publish the amount being typed so confirmation-level alerts (and the
    // alert metrics that read them) can react to an over-cap amount the user
    // never commits — Done is disabled while the cap blocks the keypad.
    useEffect(() => {
      setPendingFiatAmount(pendingFiatAmount);
    }, [pendingFiatAmount, setPendingFiatAmount]);

    useEffect(
      () => () => {
        setPendingFiatAmount(undefined);
      },
      [setPendingFiatAmount],
    );

    const { alertContent, alertMessage: alertMessageBase } =
      useTransactionCustomAmountAlerts({
        isInputChanged,
        isKeyboardVisible: stage === CustomAmountStage.AmountInput,
        pendingFiatAmount,
      });

    const hasAutoSubmittedPrefill = useRef(false);

    // A skipped prefill opens the keypad, but the skip can be transient while
    // the pay token and its balance resolve. Track the release so a prefill
    // that lands afterwards still auto-submits instead of being mistaken for
    // the user editing. Consumed on auto-submit so a keypad the user reopens
    // later is never dismissed from under them.
    const wasPrefillSkippedRef = useRef(skipDepositPrefill);
    const isPrefillSkipReleasedRef = useRef(false);

    // Tapping the amount is an explicit request to edit, which the user can
    // make as soon as the prefilled value renders — long before quotes arrive.
    // A prefill landing or re-running afterwards must not auto-submit that
    // keypad closed, which left the amount unresponsive until quotes settled.
    const hasUserOpenedKeypadRef = useRef(false);

    // Only a commit the user made freezes the amount while the request
    // prepares. An amount committed on their behalf by a prefill stays
    // tappable, so editing it never waits on quotes.
    const hasUserCommittedAmountRef = useRef(false);

    useEffect(() => {
      if (wasPrefillSkippedRef.current && !skipDepositPrefill) {
        isPrefillSkipReleasedRef.current = true;
      }
      wasPrefillSkippedRef.current = skipDepositPrefill;
    }, [skipDepositPrefill]);

    const handleDone = useCallback(async () => {
      if (isAmountUpdateInProgressRef.current) {
        return;
      }

      isAmountUpdateInProgressRef.current = true;
      // Enter the loading stage: keyboard hidden, totals skeletons shown.
      setStage(CustomAmountStage.Loading);

      try {
        await updateTokenAmount();

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

        // Stay in Loading; the stage hook leaves Loading once quotes settle.
      } catch (error) {
        const isConfirmationDismissed =
          !Engine.context.TransactionController.state.transactions.some(
            (tx) => tx.id === transactionId,
          );
        if (isConfirmationDismissed) {
          return;
        }
        const prefixed = prefixError(error, AMOUNT_UPDATE_ERROR_PREFIX);
        toast(
          getAmountUpdateErrorToastOptions(prefixed, () => toast.dismiss()),
        );
        // Reopen the keyboard so the user can retry; do not advance the flow.
        setStage(CustomAmountStage.AmountInput);
        return;
      } finally {
        isAmountUpdateInProgressRef.current = false;
      }
      EngineService.flushState();
      hasAutoSubmittedPrefill.current = true;
      // Notify the caller the amount was committed (e.g. to start quote-timing
      // instrumentation). Leaving Loading is owned solely by the stage hook's
      // exit effect, which waits for the quote fetch to settle, so we do not
      // clear the override here.
      onAmountSubmit?.();
    }, [
      amountFiat,
      onAmountSubmit,
      selectedFiatPaymentMethodId,
      setStage,
      trackAmountCommitted,
      transactionId,
      updateTokenAmount,
    ]);

    const wasPrefillPending = useRef(isPrefillPending);
    useEffect(() => {
      if (
        wasPrefillPending.current &&
        !isPrefillPending &&
        !hasUserOpenedKeypadRef.current
      ) {
        void handleDone();
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
      // A keypad opened only because the prefill was skipped is not editing;
      // one the user opened by tapping the amount is.
      if (
        stage === CustomAmountStage.AmountInput &&
        (hasUserEditedAmountRef.current ||
          hasUserOpenedKeypadRef.current ||
          !isPrefillSkipReleasedRef.current)
      ) {
        return;
      }

      if (!hasAutoSubmittedPrefill.current && amountFiat !== '0') {
        hasAutoSubmittedPrefill.current = true;
        isPrefillSkipReleasedRef.current = false;
        void handleDone();
      }
    }, [
      isDepositPrefilled,
      amountFiat,
      handleDone,
      hasUserEditedAmountRef,
      stage,
    ]);

    const isMaxAutoSubmitPending = useRef(false);

    const handlePercentagePress = useCallback(
      (percentage: number, inputType?: string) => {
        const didApplyAmount = updatePendingAmountPercentage(
          percentage,
          inputType,
        );
        // Max must not submit the page when there is no balance to deposit /
        // withdraw — the amount stays $0, so leave the keyboard open instead of
        // stranding the user on a loading screen.
        if (percentage === 100 && didApplyAmount) {
          hasUserCommittedAmountRef.current = true;
          isMaxAutoSubmitPending.current = true;
          // Max defers the commit to the effect below once the amount lands;
          // show the loading skeleton through that gap rather than the derived
          // stage, matching the direct-commit path.
          setStage(CustomAmountStage.Loading);
        }
      },
      [updatePendingAmountPercentage, setStage],
    );

    const handleDonePress = useCallback(() => {
      hasUserCommittedAmountRef.current = true;

      if (isSnapToMax(amountFiat)) {
        handlePercentagePress(100, MM_PAY_AMOUNT_INPUT_TYPE_MANUAL_SNAPPED_MAX);
        return;
      }

      void handleDone();
    }, [amountFiat, handleDone, handlePercentagePress, isSnapToMax]);

    useEffect(() => {
      // Include `stage` so Max still commits when amountFiat is unchanged
      // (e.g. user already typed the max). Waiting only on amountFiat leaves
      // isMaxAutoSubmitPending armed and the Loading stage stranded.
      if (
        isMaxAutoSubmitPending.current &&
        stage === CustomAmountStage.Loading &&
        amountFiat !== '0'
      ) {
        isMaxAutoSubmitPending.current = false;
        void handleDone();
      }
    }, [amountFiat, handleDone, stage]);

    const handleAmountPress = useCallback(() => {
      hasUserOpenedKeypadRef.current = true;
      setStage(CustomAmountStage.AmountInput);
    }, [setStage]);

    const isAccountSelectionNeeded =
      supportAccountSelection && !accountOverride;

    const hideBuyForNoFunds =
      Boolean(accountOverride) &&
      (hasAccountNoFunds || stage === CustomAmountStage.Loading);

    // A skipped prefill means nothing can fund the deposit, so a Predict
    // deposit falls back to Buy instead of an empty page (PRED-1533).
    const isPredictDepositWithoutPrefill =
      skipDepositPrefill &&
      hasTransactionType(transactionMeta, [TransactionType.predictDeposit]);

    const showBuyButton =
      (!hasPaymentOption || hasAccountNoFunds) &&
      !hideBuyForNoFunds &&
      !isPayAccountLoading &&
      (!isDepositPrefillEnabled || isPredictDepositWithoutPrefill);

    const alertMessage =
      alertMessageBase ??
      headlessBuyError ??
      (showBuyButton ? getBuyMessage(transactionMeta) : undefined);

    const hasAlert =
      stage !== CustomAmountStage.Loading && Boolean(alertMessage);

    const hasBlockingAlert = hasAlert && !headlessBuyError;

    // Keep payment details fixed while the amount update prepares the request.
    // Once quote loading takes over, reopening a picker is safe and keeps the
    // loading screen responsive.
    const shouldBlockReviewRows = isAmountUpdating;

    return (
      <Box style={styles.container}>
        <Box style={styles.inputContainer}>
          <View style={styles.amountBlock}>
            <CustomAmount
              amountFiat={amountFiat}
              currency={currency}
              hasAlert={hasAlert}
              isLoading={
                !hasAccountNoFunds &&
                stage !== CustomAmountStage.AmountInput &&
                (isPrefillPending || isDepositPrefillLoading)
              }
              // Editable amounts remain an escape hatch from stalled quotes.
              onPress={isMembershipSubscription ? undefined : handleAmountPress}
              disabled={!hasPaymentOption}
              showCursor={
                !isMembershipSubscription &&
                stage === CustomAmountStage.AmountInput
              }
            />
            <View style={styles.amountCaption}>
              {hasAlert ? (
                <AlertMessage
                  content={alertContent}
                  alertMessage={alertMessage}
                />
              ) : (
                <>
                  {!hidePayTokenAmount &&
                    disablePay !== true &&
                    !isMembershipSubscription &&
                    (isMoneyAccountDeposit ? (
                      <BalanceProjection
                        amountFiat={amountFiat}
                        projectedYears={1}
                      />
                    ) : (
                      <PayTokenAmount
                        amountHuman={amountHuman}
                        disabled={!hasPaymentOption || isAccountSelectionNeeded}
                      />
                    ))}
                  {!hidePayTokenAmount && children}
                </>
              )}
            </View>
          </View>
        </Box>
        <Box
          gap={16}
          testID={CustomAmountInfoTestIds.BOTTOM_BLOCK}
          style={styles.bottomBlock}
        >
          {isMembershipSubscription &&
            !hasAlert &&
            !hidePayTokenAmount &&
            disablePay !== true && (
              // The one-line caption is absolutely positioned under the amount.
              // This banner is taller, so it stays in the bottom block and
              // does not cover From or Pay with.
              <MembershipInfo amountFiat={amountFiat} />
            )}
          {stage === CustomAmountStage.AmountInput &&
            !isFullBalanceMoneyDeposit && (
              <>
                {supportAccountSelection &&
                  !selectedFiatPaymentMethodId &&
                  !shouldHideAccountSelector && (
                    <PayAccountSelector style={styles.separator} />
                  )}
                <PerpsAccountPickerRow />
                <PredictAccountPickerRow />
                <PerpsWithdrawFromRow
                  source={perpsWithdrawSource}
                  onSourceChange={setPerpsWithdrawSource}
                />
                {disablePay !== true &&
                  (isPayAccountLoading ? (
                    <PayWithRowSkeleton />
                  ) : (
                    (hasPaymentOption || hasAccountNoFunds) && (
                      <>
                        <PayWithRow />
                        <DepositToRow />
                      </>
                    )
                  ))}
                <MoneyDepositToRow />
                <PerpsReceiveToRow
                  destination={perpsReceiveDestination}
                  onDestinationChange={setPerpsReceiveDestination}
                />
              </>
            )}
          {stage !== CustomAmountStage.AmountInput && (
            <View
              pointerEvents={shouldBlockReviewRows ? 'none' : 'auto'}
              testID={CustomAmountInfoTestIds.REVIEW_ROWS}
            >
              {supportAccountSelection &&
                !selectedFiatPaymentMethodId &&
                !shouldHideAccountSelector && <PayAccountSelector />}
              <PerpsAccountPickerRow />
              <PredictAccountPickerRow />
              <PerpsWithdrawFromRow
                source={perpsWithdrawSource}
                onSourceChange={setPerpsWithdrawSource}
              />
              {disablePay !== true &&
                (isPayAccountLoading ? (
                  <PayWithRowSkeleton />
                ) : (
                  hasPaymentOption && (
                    <>
                      <PayWithRow isResultReady />
                      <DepositToRow isResultReady />
                    </>
                  )
                ))}
              <MoneyDepositToRow />
              <PerpsReceiveToRow
                destination={perpsReceiveDestination}
                onDestinationChange={setPerpsReceiveDestination}
              />
              {!hasAccountNoFunds && <CustomAmountTotals stage={stage} />}
            </View>
          )}
          {footerText && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.footerText}
            >
              {footerText}
            </Text>
          )}
          {!isMembershipSubscription &&
            stage === CustomAmountStage.AmountInput &&
            (hasPaymentOption || hasAccountNoFunds || isPayAccountLoading) && (
              <DepositKeyboard
                hidePercentageButtons={
                  Boolean(selectedFiatPaymentMethodId) ||
                  shouldHideAccountSelector
                }
                isDoneDisabled={hasBlockingAlert}
                value={amountFiat}
                onChange={updatePendingAmount}
                onDonePress={handleDonePress}
                onPercentagePress={handlePercentagePress}
                hasInput={hasInput}
                hasMax={
                  (hasMax || isMoneyDepositNoFee) &&
                  (isWithdraw || !isNativePayToken)
                }
              />
            )}
          {showBuyButton && <CustomAmountBuy />}
          {isMembershipSubscription &&
          amountStage === CustomAmountStage.AmountInput ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={
                disableConfirm ||
                isAccountSelectionNeeded ||
                isPrefillPending ||
                hasBlockingAlert ||
                !hasPaymentOption ||
                !hasInput
              }
              onPress={handleDone}
              testID="membership-top-up-prepare-button"
            >
              {strings('confirm.edit_amount_done')}
            </Button>
          ) : (
            stage !== CustomAmountStage.AmountInput && (
              <CustomAmountConfirmButton
                isDisabled={
                  disableConfirm ||
                  isAccountSelectionNeeded ||
                  isPrefillPending ||
                  hasAlert
                }
                onContinue={trackContinue}
                stage={stage}
              />
            )
          )}
        </Box>
        {isDeferredInitReady && (
          <CustomAmountInfoDeferredInit
            autoSelectFiatPayment={autoSelectFiatPayment}
            disablePay={disablePay}
            preferredToken={preferredToken}
          />
        )}
      </Box>
    );
  },
);

/**
 * Initialization the screen doesn't need to render or accept input: automatic
 * pay token selection, metrics and API key pre-warming. Kept in a child so a
 * confirmation that opts into first-frame deferral can mount it after the
 * screen has been presented, while the amount, keyboard and selectors are
 * live from the first frame.
 */
function CustomAmountInfoDeferredInit({
  autoSelectFiatPayment,
  disablePay,
  preferredToken,
}: Pick<
  CustomAmountInfoProps,
  'autoSelectFiatPayment' | 'disablePay' | 'preferredToken'
>) {
  useAutomaticTransactionPayToken({
    autoSelectFiatPayment,
    disable: disablePay,
    preferredToken,
  });
  useTransactionPayMetrics();
  useTransactionPayPostQuote(); // Set isPostQuote=true for post-quote transactions

  return null;
}

export function CustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Box style={styles.inputContainer}>
        <View style={styles.amountBlock}>
          <CustomAmountSkeleton />
          <View style={styles.amountCaption} testID="custom-amount-caption">
            <PayTokenAmountSkeleton />
          </View>
        </View>
      </Box>
      <Box style={styles.bottomBlock}>
        <PayWithRowSkeleton />
        <DepositKeyboardSkeleton />
      </Box>
    </Box>
  );
}

export function PrefillCustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID="prefill-custom-amount-info-skeleton">
      <View style={styles.inputContainer}>
        <View style={styles.amountBlock}>
          <CustomAmountSkeleton />
          <View style={styles.amountCaption} testID="custom-amount-caption">
            <Skeleton height={20} width={200} />
          </View>
        </View>
      </View>
      <View style={styles.bottomBlock}>
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
  const { styles } = useStyles(styleSheet, {});
  const params = useParams<ConfirmationParams>();
  // Fiat flows never render the account selector or pay-with rows while the
  // keyboard is up, so their skeletons would cause a layout shift on load.
  const hideAccountRows = Boolean(params?.autoSelectFiatPayment);

  return (
    <View
      style={styles.container}
      testID="advanced-custom-amount-info-skeleton"
    >
      <View style={styles.inputContainer}>
        <View style={styles.amountBlock}>
          <CustomAmountSkeleton />
          <View style={styles.amountCaption} testID="custom-amount-caption">
            <PayTokenAmountSkeleton />
          </View>
        </View>
      </View>
      <View style={styles.bottomBlock}>
        {!hideAccountRows && (
          <>
            <AccountSelectorSkeleton />
            <PayWithRowSkeleton />
          </>
        )}

        <DepositKeyboardSkeleton />
      </View>
    </View>
  );
}
