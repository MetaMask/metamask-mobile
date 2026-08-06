import React, {
  ReactNode,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
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
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
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
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { AlertMessage } from '../../alerts/alert-message';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayFiatPayment,
} from '../../../hooks/pay/useTransactionPayData';
import { usePayWithMoneyAccountSection } from '../../../hooks/pay/sections/usePayWithMoneyAccountSection';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
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
import { CustomAmountBuy } from '../../custom-amount/custom-amount-buy';
import { CustomAmountTotals } from '../../custom-amount/custom-amount-totals';
import { CustomAmountConfirmButton } from '../../custom-amount/custom-amount-confirm-button';

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
    const { styles } = useStyles(styleSheet, {});

    const {
      amountFiat,
      amountFiatDebounced,
      amountHuman,
      amountHumanDebounced,
      hasInput,
      hasPrefetchedQuote,
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

    const accountNoFundsAlert = useAccountNoFundsAlert();
    const hasAccountNoFunds = accountNoFundsAlert.length > 0;

    const { stage, setStage } = useCustomAmountStage({
      amountFiat,
      disablePay,
      hasAccountNoFunds,
      hasPrefetchedQuote,
      isAddMusdIntent,
      isDepositPrefillEnabled,
      isDepositPrefillLoading,
      skipDepositPrefill,
    });

    // React batches rapid presses before the state update rerenders, so keep a
    // synchronous guard separate from the render state.
    const isAmountUpdateInProgressRef = useRef(false);
    const [isAmountUpdatePending, setIsAmountUpdatePending] = useState(false);
    const isQuotesLoading = useIsTransactionPayQuoteLoading();
    useMMPayNavigation(stage, setStage);
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

    const { toastRef } = useContext(ToastContext);

    const { alertContent, alertMessage, alertTitle } =
      useTransactionCustomAmountAlerts({
        isInputChanged,
        isKeyboardVisible: stage === CustomAmountStage.AmountInput,
        pendingTokenAmount: amountHumanDebounced,
        pendingFiatAmount: amountFiatDebounced,
      });

    const hasAutoSubmittedPrefill = useRef(false);

    const handleDone = useCallback(async () => {
      if (isAmountUpdateInProgressRef.current) {
        return;
      }

      isAmountUpdateInProgressRef.current = true;
      setIsAmountUpdatePending(true);
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
        toastRef?.current?.showToast(
          getAmountUpdateErrorToastOptions(prefixed, () =>
            toastRef?.current?.closeToast(),
          ),
        );
        // Reopen the keyboard so the user can retry; do not advance the flow.
        setStage(CustomAmountStage.AmountInput);
        return;
      } finally {
        isAmountUpdateInProgressRef.current = false;
        setIsAmountUpdatePending(false);
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
      toastRef,
      trackAmountCommitted,
      transactionId,
      updateTokenAmount,
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
      if (stage === CustomAmountStage.AmountInput) {
        return;
      }

      if (!hasAutoSubmittedPrefill.current && amountFiat !== '0') {
        hasAutoSubmittedPrefill.current = true;
        handleDone();
      }
    }, [isDepositPrefilled, amountFiat, handleDone, stage]);

    const isMaxAutoSubmitPending = useRef(false);

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        const didApplyAmount = updatePendingAmountPercentage(percentage);
        // Max must not submit the page when there is no balance to deposit /
        // withdraw — the amount stays $0, so leave the keyboard open instead of
        // stranding the user on a loading screen.
        if (percentage === 100 && didApplyAmount) {
          isMaxAutoSubmitPending.current = true;
          // Max defers the commit to the effect below once the amount lands;
          // show the loading skeleton through that gap rather than the derived
          // stage, matching the direct-commit path.
          setStage(CustomAmountStage.Loading);
        }
      },
      [updatePendingAmountPercentage, setStage],
    );

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
        handleDone();
      }
    }, [amountFiat, handleDone, stage]);

    const handleAmountPress = useCallback(() => {
      setStage(CustomAmountStage.AmountInput);
    }, [setStage]);

    const isAccountSelectionNeeded =
      supportAccountSelection && !accountOverride;

    const hideBuyForNoFunds =
      Boolean(accountOverride) &&
      (hasAccountNoFunds || stage === CustomAmountStage.Loading);

    // Keep payment details fixed while the amount update prepares the request.
    // Once a Money Account deposit quote is in flight, reopening either picker
    // is safe and keeps the loading screen responsive.
    const shouldBlockReviewRows =
      stage === CustomAmountStage.Loading &&
      (isAmountUpdatePending || !isMoneyAccountDeposit || !isQuotesLoading);

    const { headlessBuyError } = useConfirmationContext();

    return (
      <Box style={styles.container}>
        <Box style={styles.inputContainer}>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={
              stage !== CustomAmountStage.Loading && Boolean(alertMessage)
            }
            isLoading={
              !hasAccountNoFunds &&
              !skipDepositPrefill &&
              (isPrefillPending || isDepositPrefillLoading)
            }
            onPress={
              stage === CustomAmountStage.Loading
                ? undefined
                : handleAmountPress
            }
            disabled={!hasPaymentOption}
            showCursor={stage === CustomAmountStage.AmountInput}
          />
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
          gap={16}
          testID={CustomAmountInfoTestIds.BOTTOM_BLOCK}
          style={styles.bottomBlock}
        >
          {stage !== CustomAmountStage.Loading && (
            <AlertMessage
              content={alertContent}
              alertMessage={alertMessage ?? headlessBuyError}
            />
          )}
          {stage === CustomAmountStage.AmountInput && !isAddMusdIntent && (
            <>
              {supportAccountSelection &&
                !selectedFiatPaymentMethodId &&
                !shouldHideAccountSelector && (
                  <PayAccountSelector style={styles.separator} />
                )}
              <PerpsAccountPickerRow />
              <PredictAccountPickerRow />
              {disablePay !== true &&
                (hasPaymentOption || hasAccountNoFunds) && <PayWithRow />}
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
              {disablePay !== true && hasPaymentOption && (
                <PayWithRow isResultReady />
              )}
              {!hasAccountNoFunds && (
                <CustomAmountTotals
                  amountFiat={amountFiat}
                  canSelectWithdrawToken={canSelectWithdrawToken}
                  stage={stage}
                />
              )}
              <PercentageRow />
            </View>
          )}
          {footerText && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.footerText}
            >
              {footerText}
            </Text>
          )}
          {stage === CustomAmountStage.AmountInput &&
            (hasPaymentOption || hasAccountNoFunds) && (
              <DepositKeyboard
                hidePercentageButtons={
                  Boolean(selectedFiatPaymentMethodId) ||
                  shouldHideAccountSelector
                }
                alertMessage={alertTitle}
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
            )}
          {(!hasPaymentOption || hasAccountNoFunds) &&
            !hideBuyForNoFunds &&
            !isDepositPrefillEnabled && <CustomAmountBuy />}
          {stage !== CustomAmountStage.AmountInput && (
            <CustomAmountConfirmButton
              alertTitle={alertTitle}
              isDisabled={
                disableConfirm || isAccountSelectionNeeded || isPrefillPending
              }
              onContinue={trackContinue}
              stage={stage}
            />
          )}
        </Box>
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Box style={styles.inputContainer}>
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
      </Box>
      <Box>
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
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
      </View>
      <View>
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
