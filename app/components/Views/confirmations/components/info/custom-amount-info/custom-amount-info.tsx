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
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
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
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { AlignItems } from '../../../../../UI/Box/box.types';
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
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import { useMMPayHardwareAccountAlert } from '../../../hooks/alerts/useMMPayHardwareAccountAlert';
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
import { InfoRowSkeleton } from '../../UI/info-row/info-row';

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
    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setIsKeyboardVisible] =
      useState(!isAddMusdIntent);
    const keyboardEverShown = useRef(!isAddMusdIntent);

    useMMPayNavigation(
      isKeyboardVisible,
      setIsKeyboardVisible,
      keyboardEverShown,
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

    const {
      amountFiat,
      amountFiatDebounced,
      amountHuman,
      amountHumanDebounced,
      hasInput,
      isInputChanged,
      isPrefillPending,
      updatePendingAmount,
      updatePendingAmountPercentage,
      updateTokenAmount,
    } = useTransactionCustomAmount({ currency });

    const { alertMessage, alertTitle } = useTransactionCustomAmountAlerts({
      isInputChanged,
      isKeyboardVisible,
      pendingTokenAmount: amountHumanDebounced,
      pendingFiatAmount: amountFiatDebounced,
    });

    const handleDone = useCallback(async () => {
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

    const handleAmountPress = useCallback(() => {
      keyboardEverShown.current = true;
      setIsKeyboardVisible(true);
    }, []);

    const isAccountSelectionNeeded =
      supportAccountSelection && !accountOverride;
    const hideDetailsForNoFunds = hasAccountNoFunds && Boolean(accountOverride);
    const hideBuyForNoFunds =
      Boolean(accountOverride) && (hasAccountNoFunds || isQuotesLoading);

    const { headlessBuyError } = useConfirmationContext();

    return (
      <Box style={styles.container}>
        <Box style={styles.inputContainer}>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(alertMessage)}
            isLoading={isPrefillPending}
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
          gap={16}
          testID={CustomAmountInfoTestIds.BOTTOM_BLOCK}
          style={styles.bottomBlock}
        >
          <AlertMessage alertMessage={alertMessage ?? headlessBuyError} />
          {!isResultReady && !(isKeyboardVisible && isMoneyAccountDeposit) && (
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
              {!hideDetailsForNoFunds &&
                (showPaymentDetails ? (
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
                  isAddMusdIntent && (
                    <>
                      <InfoRowSkeleton />
                      <InfoRowSkeleton />
                      <InfoRowSkeleton />
                    </>
                  )
                ))}
              <PercentageRow />
            </Box>
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
              onPercentagePress={updatePendingAmountPercentage}
              hasInput={hasInput}
              hasMax={
                (hasMax || isMoneyDepositNoFee) &&
                (isWithdraw || !isNativePayToken)
              }
            />
          )}
          {(!hasPaymentOption || hasAccountNoFunds) && !hideBuyForNoFunds && (
            <BuySection />
          )}
          {!isKeyboardVisible && (
            <ConfirmButton
              alertTitle={alertTitle}
              disableConfirm={
                disableConfirm || isAccountSelectionNeeded || isPrefillPending
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

export function AdvancedCustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

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
        <AccountSelectorSkeleton />
        <PayWithRowSkeleton />
        <DepositKeyboardSkeleton />
      </View>
    </View>
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
    <Box alignItems={AlignItems.center} gap={20}>
      {message && (
        <Text variant={TextVariant.BodySM} color={TextColor.Error}>
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
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const { isHeadlessBuyInProgress, setIsConfirmationSubmitting } =
    useConfirmationContext();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useConfirmActions();
  // Not part of the alerts context, so checked separately here. The account
  // can switch to a hardware wallet at any point via PayAccountSelector.
  const hardwareAccountAlerts = useMMPayHardwareAccountAlert();
  const disabled =
    hasBlockingAlerts ||
    hardwareAccountAlerts.length > 0 ||
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
      style={[disabled && styles.disabledButton]}
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
