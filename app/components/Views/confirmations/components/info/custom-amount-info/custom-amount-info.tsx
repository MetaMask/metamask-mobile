import React, { ReactNode, memo, useCallback, useState } from 'react';
import { toCaipAssetType } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
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
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from '../../../hooks/pay/useAutomaticTransactionPayToken';
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
import { hasTransactionType } from '../../../utils/transaction';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import EngineService from '../../../../../../core/EngineService';
import Engine from '../../../../../../core/Engine';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import PayAccountSelector from '../../PayAccountSelector';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
  hasMax?: boolean;
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
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({
    children,
    currency,
    disableConfirm,
    disablePay,
    hasMax,
    onAmountSubmit,
    hidePayTokenAmount,
    preferredToken,
    footerText,
  }) => {
    useClearConfirmationOnBackSwipe();

    const { canSelectWithdrawToken } = useTransactionPayWithdraw();

    useAutomaticTransactionPayToken({
      disable: disablePay,
      preferredToken,
    });
    useTransactionPayMetrics();
    useTransactionPayPostQuote(); // Set isPostQuote=true for post-quote transactions

    const { isNative: isNativePayToken } = useTransactionPayToken();
    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
    const { hasTokens } = useTransactionPayAvailableTokens();
    const fiatPayment = useTransactionPayFiatPayment();
    const selectedFiatPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
    const transactionMeta = useTransactionMetadataRequest();
    const transactionId = transactionMeta?.id;

    const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountWithdraw,
    ]);
    const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
    ]);
    const [hasSelectedAccount, setHasSelectedAccount] = useState(false);

    const handleAccountSelected = useCallback(() => {
      setHasSelectedAccount(true);
    }, []);

    const isAccountMissing =
      (isMoneyAccountWithdraw || isMoneyAccountDeposit) && !hasSelectedAccount;

    const isResultReady = useIsResultReady({ isKeyboardVisible });
    const quotes = useTransactionPayQuotes();
    const isQuotesLoading = useIsTransactionPayLoading();
    const hasSourceAmount = useTransactionPayHasSourceAmount();
    const { alerts } = useAlerts();
    const hasNoQuotesAlert = alerts.some(
      (a) => a.key === AlertKeys.NoPayTokenQuotes,
    );
    const showPaymentDetails =
      isQuotesLoading ||
      Boolean(quotes?.length) ||
      (!hasSourceAmount && !hasNoQuotesAlert);

    const {
      amountFiat,
      amountHuman,
      amountHumanDebounced,
      hasInput,
      isInputChanged,
      updatePendingAmount,
      updatePendingAmountPercentage,
      updateTokenAmount,
    } = useTransactionCustomAmount({ currency });

    const { alertMessage, alertTitle } = useTransactionCustomAmountAlerts({
      isInputChanged,
      isKeyboardVisible,
      pendingTokenAmount: amountHumanDebounced,
    });

    const handleDone = useCallback(() => {
      if (selectedFiatPaymentMethodId && transactionId) {
        Engine.context.TransactionPayController.updateFiatPayment({
          transactionId,
          callback: (fp) => {
            fp.amountFiat = amountFiat;
          },
        });
      } else {
        updateTokenAmount();
      }

      EngineService.flushState();
      setIsKeyboardVisible(false);
      onAmountSubmit?.();
    }, [
      amountFiat,
      onAmountSubmit,
      selectedFiatPaymentMethodId,
      transactionId,
      updateTokenAmount,
    ]);

    const handleAmountPress = useCallback(() => {
      setIsKeyboardVisible(true);
    }, []);

    return (
      <Box style={styles.container}>
        <Box style={styles.inputContainer}>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(alertMessage)}
            onPress={handleAmountPress}
            disabled={!hasTokens}
          />
          {!hidePayTokenAmount && disablePay !== true && (
            <PayTokenAmount amountHuman={amountHuman} disabled={!hasTokens} />
          )}
          {!hidePayTokenAmount && children}
        </Box>
        <Box gap={16}>
          <AlertMessage alertMessage={alertMessage} />
          {!hidePayTokenAmount && (
            <>
              {isMoneyAccountDeposit && (
                <PayAccountSelector
                  label={strings('confirm.label.from')}
                  onAccountSelected={handleAccountSelected}
                />
              )}
              {isMoneyAccountWithdraw && (
                <PayAccountSelector
                  isPostQuote
                  onAccountSelected={handleAccountSelected}
                />
              )}
            </>
          )}
          {!isResultReady && disablePay !== true && hasTokens && <PayWithRow />}
          {isResultReady && (
            <Box>
              {disablePay !== true && hasTokens && <PayWithRow />}
              {showPaymentDetails && (
                <>
                  <BridgeFeeRow />
                  <BridgeTimeRow />
                  {canSelectWithdrawToken ? (
                    <ReceiveRow inputAmountUsd={amountFiat} />
                  ) : (
                    <TotalRow />
                  )}
                </>
              )}
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
          {isKeyboardVisible && hasTokens && (
            <DepositKeyboard
              hidePercentageButtons={Boolean(selectedFiatPaymentMethodId)}
              alertMessage={alertTitle}
              value={amountFiat}
              onChange={updatePendingAmount}
              onDonePress={handleDone}
              onPercentagePress={updatePendingAmountPercentage}
              hasInput={hasInput}
              hasMax={hasMax && !isNativePayToken}
            />
          )}
          {!hasTokens && <BuySection />}
          {!isKeyboardVisible && (
            <ConfirmButton
              alertTitle={alertTitle}
              disableConfirm={disableConfirm || isAccountMissing}
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
}: Readonly<{ alertTitle: string | undefined; disableConfirm?: boolean }>) {
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useTransactionConfirm();
  const disabled = hasBlockingAlerts || isLoading || Boolean(disableConfirm);
  const buttonLabel = useButtonLabel();

  return (
    <Button
      style={[disabled && styles.disabledButton]}
      size={ButtonSize.Lg}
      variant={ButtonVariant.Primary}
      isFullWidth
      isDisabled={disabled}
      onPress={() => onConfirm()}
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

  if (
    hasTransactionType(transaction, [
      TransactionType.predictWithdraw,
      TransactionType.perpsWithdraw,
      TransactionType.moneyAccountWithdraw,
    ])
  ) {
    return strings('confirm.deposit_edit_amount_predict_withdraw');
  }

  if (hasTransactionType(transaction, [TransactionType.musdConversion])) {
    return strings('earn.musd_conversion.convert');
  }

  return strings('confirm.deposit_edit_amount_done');
}
