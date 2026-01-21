import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  PayTokenAmount,
  PayTokenAmountSkeleton,
} from '../../../../Views/confirmations/components/pay-token-amount';
import {
  PayWithRow,
  PayWithRowSkeleton,
} from '../../../../Views/confirmations/components/rows/pay-with-row';
import { BridgeFeeRow } from '../../../../Views/confirmations/components/rows/bridge-fee-row';
import { BridgeTimeRow } from '../../../../Views/confirmations/components/rows/bridge-time-row';
import { TotalRow } from '../../../../Views/confirmations/components/rows/total-row';
import { PercentageRow } from '../../../../Views/confirmations/components/rows/percentage-row';
import {
  DepositKeyboard,
  DepositKeyboardSkeleton,
} from '../../../../Views/confirmations/components/deposit-keyboard';
import { Box } from '../../../../UI/Box/Box';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsInlineDeposit.styles';
import { useTransactionCustomAmount } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts';
import useClearConfirmationOnBackSwipe from '../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from '../../../../Views/confirmations/hooks/pay/useAutomaticTransactionPayToken';
import { AlertMessage } from '../../../../Views/confirmations/components/alerts/alert-message';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../../../Views/confirmations/components/transactions/custom-amount';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionPayMetrics } from '../../../../Views/confirmations/hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../../Views/confirmations/hooks/send/useAccountTokens';
import { toCaipAssetType } from '@metamask/utils';
import { AlignItems } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useAlerts } from '../../../../Views/confirmations/context/alert-system-context';
import { useTransactionConfirm } from '../../../../Views/confirmations/hooks/transactions/useTransactionConfirm';
import EngineService from '../../../../../core/EngineService';
import { ConfirmationFooterSelectorIDs } from '../../../../Views/confirmations/ConfirmationView.testIds';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
  hasMax?: boolean;
  preferredToken?: SetPayTokenRequest;
  /**
   * Optional render function that overrides the default content.
   * When set, automatically hides PayTokenAmount, PayWithRow, and children.
   */
  overrideContent?: (amountHuman: string) => ReactNode;
  defaultValue?: string;
  minimalView?: boolean;
  /**
   * If true, skips navigation after transaction confirmation.
   * Useful when the confirmation screen is used as a modal and should stay on the current screen.
   */
  skipNavigation?: boolean;
  /**
   * Optional token name to display in the confirm button.
   */
  tokenName?: string;
  /**
   * Optional callback to be called when the user confirms the transaction.
   */
  onConfirmCallback?: (transactionMeta: TransactionMeta) => void;
}

export const PerpsInlineDeposit: React.FC<CustomAmountInfoProps> = memo(
  ({
    children,
    currency,
    disablePay,
    hasMax,
    overrideContent,
    preferredToken,
    defaultValue,
    minimalView = true,
    skipNavigation = false,
    tokenName,
    onConfirmCallback,
  }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken({
      disable: disablePay,
      preferredToken,
    });
    useTransactionPayMetrics();

    const { isNative: isNativePayToken } = useTransactionPayToken();
    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
    const availableTokens = useTransactionPayAvailableTokens();
    const hasTokens = availableTokens.length > 0;

    const isResultReady = useIsResultReady({
      isKeyboardVisible,
    });

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

    useEffect(() => {
      if (defaultValue) {
        updatePendingAmount(defaultValue);
      }
    }, [defaultValue, updatePendingAmount]);

    const { alertMessage, alertTitle } = useTransactionCustomAmountAlerts({
      isInputChanged,
      isKeyboardVisible,
      pendingTokenAmount: amountHumanDebounced,
    });

    const handleDone = useCallback(() => {
      updateTokenAmount();
      EngineService.flushState();
      setIsKeyboardVisible(false);
    }, [updateTokenAmount]);

    const handleAmountPress = useCallback(() => {
      setIsKeyboardVisible(true);
    }, []);

    return (
      <Box style={[!minimalView && styles.container]}>
        <Box style={[!minimalView && styles.inputContainer]}>
          {!minimalView && (
            <CustomAmount
              amountFiat={amountFiat}
              currency={currency}
              hasAlert={Boolean(alertMessage)}
              onPress={handleAmountPress}
              disabled={!hasTokens}
            />
          )}
          {!minimalView && overrideContent ? (
            overrideContent(amountHuman)
          ) : (
            <>
              {!minimalView && disablePay !== true && (
                <PayTokenAmount
                  amountHuman={amountHuman}
                  disabled={!hasTokens}
                />
              )}
              {children}
              {disablePay !== true && hasTokens && <PayWithRow />}
            </>
          )}
        </Box>
        <Box gap={25}>
          <AlertMessage alertMessage={alertMessage} />
          {isResultReady && (
            <Box>
              <BridgeFeeRow />
              <BridgeTimeRow />
              <TotalRow />
              <PercentageRow />
            </Box>
          )}
          {isKeyboardVisible && hasTokens && !minimalView && (
            <DepositKeyboard
              alertMessage={alertTitle}
              value={amountFiat}
              onChange={updatePendingAmount}
              onDonePress={handleDone}
              onPercentagePress={updatePendingAmountPercentage}
              hasInput={hasInput}
              hasMax={hasMax && !isNativePayToken}
            />
          )}
          {minimalView && !isResultReady && (
            <Box>
              <Button
                label="Confirm"
                onPress={handleDone}
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
              />
            </Box>
          )}
          {!minimalView && (
            <Box>
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {amountFiat}
              </Text>
            </Box>
          )}
          {!hasTokens && <BuySection />}
          {!isKeyboardVisible && (
            <ConfirmButton
              alertTitle={alertTitle}
              skipNavigation={skipNavigation}
              tokenName={tokenName}
              onConfirmCallback={onConfirmCallback}
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
        <PayWithRowSkeleton />
      </Box>
      <DepositKeyboardSkeleton />
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
        label={strings('confirm.custom_amount.buy_button')}
        variant={ButtonVariants.Primary}
        onPress={handleBuyPress}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
      />
    </Box>
  );
}

function ConfirmButton({
  alertTitle,
  skipNavigation,
  tokenName: _tokenName,
  onConfirmCallback,
}: Readonly<{
  alertTitle: string | undefined;
  skipNavigation?: boolean;
  tokenName?: string;
  onConfirmCallback?: (transactionMeta: TransactionMeta) => void;
}>) {
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useTransactionConfirm({
    skipNavigation,
    onConfirmCallback,
  });
  const disabled = hasBlockingAlerts || isLoading;
  const buttonLabel = useButtonLabel();
  const { payToken } = useTransactionPayToken();

  let label = alertTitle ?? buttonLabel;

  label =
    label === 'Add funds' && payToken
      ? 'Execute trade ' + payToken.symbol
      : label;

  return (
    <Button
      style={[disabled && styles.disabledButton]}
      size={ButtonSize.Lg}
      label={label}
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      disabled={disabled}
      onPress={onConfirm}
      testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
    />
  );
}

function useIsResultReady({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const requiredTokens = useTransactionPayRequiredTokens();
  const sourceAmounts = useTransactionPaySourceAmounts();

  const hasSourceAmount = sourceAmounts?.some((a) =>
    requiredTokens.some(
      (rt) =>
        rt.address.toLowerCase() === a.targetTokenAddress.toLowerCase() &&
        !rt.skipIfBalance,
    ),
  );

  return (
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || !hasSourceAmount)
  );
}

function useButtonLabel() {
  const transaction = useTransactionMetadataRequest();

  if (hasTransactionType(transaction, [TransactionType.predictWithdraw])) {
    return strings('confirm.deposit_edit_amount_predict_withdraw');
  }

  if (hasTransactionType(transaction, [TransactionType.musdConversion])) {
    return strings('earn.musd_conversion.convert');
  }

  return strings('confirm.deposit_edit_amount_done');
}
