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
import { strings } from '../../../../../../../locales/i18n';
import { CustomAmountBuy } from '../../custom-amount/custom-amount-buy';
import { CustomAmountTotals } from '../../custom-amount/custom-amount-totals';
import { CustomAmountConfirmButton } from '../../custom-amount/custom-amount-confirm-button';

const AMOUNT_UPDATE_ERROR_PREFIX = 'MetaMask Pay: Amount Update: ';
/** Reserve up to two BodySm lines so HelpText appearance does not shift the amount block. */
const HELP_TEXT_SLOT_MIN_HEIGHT = typography.sBodySM.lineHeight * 2;

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

    const { helpText, hasBlockingError } = useTransactionCustomAmountAlerts({
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
      hasBlockingErrorEffective;

    const showLiveAccountSelector =
      Boolean(supportAccountSelection) &&
      !selectedFiatPaymentMethodId &&
      !shouldHideAccountSelector;

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
              onPress={
                stage === CustomAmountStage.Loading
                  ? undefined
                  : handleAmountPress
              }
              disabled={!hasPaymentOption}
              showCursor={stage === CustomAmountStage.AmountInput}
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
          {stage === CustomAmountStage.AmountInput && !isAddMusdIntent && (
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
          {stage !== CustomAmountStage.AmountInput && (
            <View
              pointerEvents={shouldBlockReviewRows ? 'none' : 'auto'}
              testID={CustomAmountInfoTestIds.REVIEW_ROWS}
            >
              {showLiveAccountSelector && <PayAccountSelector />}
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
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="self-center px-4"
            >
              {footerText}
            </Text>
          )}
          {stage === CustomAmountStage.AmountInput &&
            !(showBuySection && buyEmptyHelpText) &&
            (hasPaymentOption || hasAccountNoFunds) && (
              <Box twClassName="px-4">
                <DepositKeyboard
                  hidePercentageButtons={
                    Boolean(selectedFiatPaymentMethodId) ||
                    shouldHideAccountSelector
                  }
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
          {stage !== CustomAmountStage.AmountInput && !hideConfirm && (
            <Box twClassName="px-4">
              <CustomAmountConfirmButton
                disableConfirm={
                  disableConfirmEffective ||
                  stage !== CustomAmountStage.ShowTotals
                }
                isAmountUpdating={isAmountUpdatePending}
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
