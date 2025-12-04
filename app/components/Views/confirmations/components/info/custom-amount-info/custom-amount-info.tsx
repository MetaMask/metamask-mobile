import React, { ReactNode, memo, useCallback, useState } from 'react';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import { PayWithRow, PayWithRowSkeleton } from '../../rows/pay-with-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
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
import { AlertMessage } from '../../alerts/alert-message';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { getNativeTokenAddress } from '../../../utils/asset';
import { toCaipAssetType } from '@metamask/utils';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { strings } from '../../../../../../../locales/i18n';
import { hasTransactionType } from '../../../utils/transaction';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { useAlerts } from '../../../context/alert-system-context';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import EngineService from '../../../../../../core/EngineService';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
  hasMax?: boolean;
  preferredToken?: SetPayTokenRequest;
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({ children, currency, disablePay, hasMax, preferredToken }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken({
      disable: disablePay,
      preferredToken,
    });
    useTransactionPayMetrics();

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
      <Box style={styles.container}>
        <Box style={styles.inputContainer}>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(alertMessage)}
            onPress={handleAmountPress}
            disabled={!hasTokens}
          />
          {disablePay !== true && (
            <PayTokenAmount amountHuman={amountHuman} disabled={!hasTokens} />
          )}
          {children}
          {disablePay !== true && hasTokens && <PayWithRow />}
        </Box>
        <Box gap={25}>
          <AlertMessage alertMessage={alertMessage} />
          {isResultReady && (
            <Box>
              <BridgeFeeRow />
              <BridgeTimeRow />
              <TotalRow />
            </Box>
          )}
          {isKeyboardVisible && hasTokens && (
            <DepositKeyboard
              alertMessage={alertTitle}
              value={amountFiat}
              onChange={updatePendingAmount}
              onDonePress={handleDone}
              onPercentagePress={updatePendingAmountPercentage}
              hasInput={hasInput}
              hasMax={hasMax}
            />
          )}
          {!hasTokens && <BuySection />}
          {!isKeyboardVisible && <ConfirmButton alertTitle={alertTitle} />}
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
}: Readonly<{ alertTitle: string | undefined }>) {
  const { styles } = useStyles(styleSheet, {});
  const { hasBlockingAlerts } = useAlerts();
  const isLoading = useIsTransactionPayLoading();
  const { onConfirm } = useTransactionConfirm();
  const disabled = hasBlockingAlerts || isLoading;
  const buttonLabel = useButtonLabel();

  return (
    <Button
      style={[disabled && styles.disabledButton]}
      size={ButtonSize.Lg}
      label={alertTitle ?? buttonLabel}
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      disabled={disabled}
      onPress={onConfirm}
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
    return strings('earn.musd_conversion.confirmation_button');
  }

  return strings('confirm.deposit_edit_amount_done');
}
