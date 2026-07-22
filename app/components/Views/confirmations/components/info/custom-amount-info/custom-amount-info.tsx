import React, {
  ReactNode,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { toCaipAssetType } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import { BalanceProjection } from '../../../../../UI/Money/components/BalanceProjection';
import { PayWithRow, PayWithRowSkeleton } from '../../rows/pay-with-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { ReceiveRow } from '../../rows/receive-row';
import { PercentageRow } from '../../rows/percentage-row';
import {
  DepositKeyboard,
  DepositKeyboardSkeleton,
} from '../../deposit-keyboard';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
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
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../../../hooks/pay/useTransactionPayHasSourceAmount';
import { usePayWithMoneyAccountSection } from '../../../hooks/pay/sections/usePayWithMoneyAccountSection';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { strings } from '../../../../../../../locales/i18n';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../../utils/transaction';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import EngineService from '../../../../../../core/EngineService';
import Engine from '../../../../../../core/Engine';
import { getAmountUpdateErrorToastOptions } from '../../../../../../util/confirmation/transactions';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { prefixError } from '../../../../../../util/transactions/error-prefix';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useMoneyNoFeeTokens } from '../../../hooks/pay/useMoneyNoFeeTokens';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import PayAccountSelector from '../../PayAccountSelector';
import { AccountSelectorSkeleton } from '../../AccountSelector';
import { PerpsAccountPickerRow } from '../../rows/perps-account-picker-row';
import { PredictAccountPickerRow } from '../../rows/predict-account-picker-row';
import { useTransactionAccountOverride } from '../../../hooks/transactions/useTransactionAccountOverride';
import { CustomAmountInfoTestIds } from './custom-amount-info.testIds';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useFiatFunnelMetricsAdapter } from '../../../../../UI/Ramp/hooks/useFiatFunnelMetricsAdapter';
import { getMoneyAccountDepositIntent } from '../../../../../UI/Money/hooks/useMoneyAccount';
import { KeyValueRowSkeleton } from '../../rows/key-value-row-skeleton';

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

    const { isNative: isNativePayToken } = useTransactionPayToken();
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

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(
      !isAddMusdIntent && !isDepositPrefillEnabled,
    );
    const isKeyboardVisibleRef = useRef(isKeyboardVisible);
    isKeyboardVisibleRef.current = isKeyboardVisible;
    const wasKeyboardEverVisible = useRef(isKeyboardVisible);
    if (isKeyboardVisible) {
      wasKeyboardEverVisible.current = true;
    }
    useMMPayNavigation(
      isKeyboardVisible,
      setIsKeyboardVisible,
      wasKeyboardEverVisible,
    );
    const { hasTokens: hasAvailableTokens } =
      useTransactionPayAvailableTokens();
    const fiatPayment = useTransactionPayFiatPayment();
    const selectedFiatPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
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

    const isResultReady =
      useIsResultReady({ isKeyboardVisible }) ||
      (isAddMusdIntent && !isKeyboardVisible);
    const quotes = useTransactionPayQuotes();
    const isQuotesLoading = useIsTransactionPayLoading();
    const hasSourceAmount = useTransactionPayHasSourceAmount();
    const { alerts } = useAlerts();
    const accountNoFundsAlert = useAccountNoFundsAlert();
    const hasAccountNoFunds = accountNoFundsAlert.length > 0;
    const hasNoQuotesAlert = alerts.some(
      (a) => a.key === AlertKeys.NoPayTokenQuotes,
    );
    const showPaymentDetails =
      isQuotesLoading ||
      Boolean(quotes?.length) ||
      (!isAddMusdIntent && !hasSourceAmount && !hasNoQuotesAlert);

    const isAwaitingPrefillResult =
      !hasAccountNoFunds &&
      (isDepositPrefillLoading ||
        (isDepositPrefilled && !hasSourceAmount && !isKeyboardVisible));

    const { alertMessage, alertTitle } = useTransactionCustomAmountAlerts({
      isInputChanged,
      isKeyboardVisible,
      pendingTokenAmount: amountHumanDebounced,
      pendingFiatAmount: amountFiatDebounced,
    });

    const hasAutoSubmittedPrefill = useRef(false);

    const handleDone = useCallback(async () => {
      const keyboardVisibleAtStart = isKeyboardVisibleRef.current;
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
        // Keep keyboard visible so the user can retry; do not advance the flow.
        return;
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

    const isMaxAutoSubmitPending = useRef(false);

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        updatePendingAmountPercentage(percentage);
        if (percentage === 100) {
          isMaxAutoSubmitPending.current = true;
          setIsKeyboardVisible(false);
        }
      },
      [updatePendingAmountPercentage],
    );

    useEffect(() => {
      if (isMaxAutoSubmitPending.current && amountFiat !== '0') {
        isMaxAutoSubmitPending.current = false;
        handleDone();
      }
    }, [amountFiat, handleDone]);

    const handleAmountPress = useCallback(() => {
      wasKeyboardEverVisible.current = true;
      setIsKeyboardVisible(true);
    }, []);

    const isAccountSelectionNeeded =
      supportAccountSelection && !accountOverride;
    const hideDetailsForNoFunds = hasAccountNoFunds && Boolean(accountOverride);
    const hideBuyForNoFunds =
      Boolean(accountOverride) && (hasAccountNoFunds || isQuotesLoading);

    const { headlessBuyError } = useConfirmationContext();

    return (
      <Box twClassName="flex-1 flex-col justify-between">
        <Box twClassName="flex-1 justify-center items-center gap-3.5">
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(alertMessage)}
            isLoading={
              !hasAccountNoFunds &&
              (isPrefillPending || isDepositPrefillLoading)
            }
            onPress={handleAmountPress}
            disabled={!hasPaymentOption}
            showCursor={isKeyboardVisible}
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
          gap={4}
          testID={CustomAmountInfoTestIds.BOTTOM_BLOCK}
          twClassName={Platform.OS === 'android' ? 'pb-4' : 'pb-0'}
        >
          <AlertMessage alertMessage={alertMessage ?? headlessBuyError} />
          {!isResultReady && !(isKeyboardVisible && isAddMusdIntent) && (
            <>
              {supportAccountSelection &&
                !selectedFiatPaymentMethodId &&
                !shouldHideAccountSelector && (
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
            <Box>
              {supportAccountSelection &&
                !selectedFiatPaymentMethodId &&
                !shouldHideAccountSelector && <PayAccountSelector />}
              <PerpsAccountPickerRow />
              <PredictAccountPickerRow />
              {disablePay !== true && hasPaymentOption && (
                <PayWithRow isResultReady />
              )}
              {!hasAccountNoFunds &&
                (showPaymentDetails && !isAwaitingPrefillResult ? (
                  <>
                    <BridgeFeeRow />
                    <BridgeTimeRow />
                    {canSelectWithdrawToken ? (
                      <ReceiveRow inputAmountUsd={amountFiat} />
                    ) : (
                      <TotalRow />
                    )}
                  </>
                ) : (
                  (isAddMusdIntent || isAwaitingPrefillResult) && (
                    <>
                      <KeyValueRowSkeleton />
                      <KeyValueRowSkeleton />
                      <KeyValueRowSkeleton />
                    </>
                  )
                ))}
              <PercentageRow />
            </Box>
          )}
          {footerText && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="self-center"
            >
              {footerText}
            </Text>
          )}
          {isKeyboardVisible && (hasPaymentOption || hasAccountNoFunds) && (
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
            !isDepositPrefillEnabled && <BuySection />}
          {!isKeyboardVisible && (
            <ConfirmButton
              alertTitle={alertTitle}
              disableConfirm={
                disableConfirm ||
                isAccountSelectionNeeded ||
                isPrefillPending ||
                isAwaitingPrefillResult
              }
              onContinue={trackContinue}
            />
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
        <DepositKeyboardSkeleton />
      </Box>
    </Box>
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
        <DepositKeyboardSkeleton />
      </Box>
    </Box>
  );
}

function BuySection() {
  const transactionMeta = useTransactionMetadataRequest();
  const tokens = useAccountTokens({ includeNoBalance: true });
  const requiredTokens = useTransactionPayRequiredTokens();

  const primaryRequiredToken = requiredTokens.find(
    (token) => token.address !== getNativeTokenAddress(token.chainId),
  );

  const asset = tokens.find(
    (token) =>
      token.address?.toLowerCase() ===
        primaryRequiredToken?.address.toLowerCase() &&
      token.chainId === primaryRequiredToken?.chainId,
  );

  const assetId = toCaipAssetType(
    'eip155',
    Number(primaryRequiredToken?.chainId ?? '0x0').toString(),
    'erc20',
    asset?.assetId ?? '0x0',
  );

  const { goToBuy } = useRampNavigation();

  const handleBuyPress = useCallback(() => {
    goToBuy({ assetId });
  }, [assetId, goToBuy]);

  let message: string | undefined;

  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    message = strings('confirm.custom_amount.buy_perps');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    message = strings('confirm.custom_amount.buy_predict');
  }

  return (
    <Box alignItems={BoxAlignItems.Center} gap={5}>
      {message && (
        <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
          {message}
        </Text>
      )}
      <Button
        variant={ButtonVariant.Primary}
        onPress={handleBuyPress}
        isFullWidth
        size={ButtonSize.Lg}
      >
        {strings('confirm.custom_amount.buy_button')}
      </Button>
    </Box>
  );
}

function ConfirmButton({
  alertTitle,
  disableConfirm,
  onContinue,
}: Readonly<{
  alertTitle: string | undefined;
  disableConfirm?: boolean;
  onContinue?: () => void;
}>) {
  const { hasBlockingAlerts } = useAlerts();
  const { isHeadlessBuyInProgress, setIsConfirmationSubmitting } =
    useConfirmationContext();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useConfirmActions();
  const disabled =
    hasBlockingAlerts ||
    isLoading ||
    Boolean(disableConfirm) ||
    isHeadlessBuyInProgress;
  const buttonLabel = useButtonLabel();

  const handleConfirm = useCallback(async () => {
    setIsConfirmationSubmitting(true);
    // Continue / Add Funds CTA funnel event; no-op for non-money flows.
    onContinue?.();
    try {
      await onConfirm();
    } catch (error) {
      setIsConfirmationSubmitting(false);
      throw error;
    }
  }, [onConfirm, onContinue, setIsConfirmationSubmitting]);

  return (
    <Button
      twClassName={disabled ? 'opacity-50' : undefined}
      size={ButtonSize.Lg}
      variant={ButtonVariant.Primary}
      isFullWidth
      isDisabled={disabled}
      isLoading={isHeadlessBuyInProgress}
      loadingText={strings('confirm.preparing_order')}
      onPress={handleConfirm}
      testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
    >
      {alertTitle ?? buttonLabel}
    </Button>
  );
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

function useButtonLabel() {
  const transaction = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  if (hasTransactionType(transaction, [TransactionType.moneyAccountWithdraw])) {
    return strings('confirm.deposit_edit_amount_money_account_send');
  }

  if (
    hasTransactionType(transaction, [
      TransactionType.predictWithdraw,
      TransactionType.perpsWithdraw,
    ])
  ) {
    return strings('confirm.deposit_edit_amount_predict_withdraw');
  }

  if (hasTransactionType(transaction, [TransactionType.musdConversion])) {
    return strings('earn.musd_conversion.confirm');
  }

  if (
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transaction, [
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
    ])
  ) {
    return strings('confirm.deposit_edit_amount_money_account_send');
  }

  return strings('confirm.deposit_edit_amount_done');
}
