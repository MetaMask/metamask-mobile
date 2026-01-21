import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { toCaipAssetType } from '@metamask/utils';
import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import EngineService from '../../../../../core/EngineService';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems } from '../../../../UI/Box/box.types';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { ConfirmationFooterSelectorIDs } from '../../../../Views/confirmations/ConfirmationView.testIds';
import { AlertMessage } from '../../../../Views/confirmations/components/alerts/alert-message';
import {
  DepositKeyboardSkeleton
} from '../../../../Views/confirmations/components/deposit-keyboard';
import {
  PayTokenAmountSkeleton
} from '../../../../Views/confirmations/components/pay-token-amount';
import { BridgeFeeRow } from '../../../../Views/confirmations/components/rows/bridge-fee-row';
import { BridgeTimeRow } from '../../../../Views/confirmations/components/rows/bridge-time-row';
import {
  PayWithRow,
  PayWithRowSkeleton,
} from '../../../../Views/confirmations/components/rows/pay-with-row';
import { PercentageRow } from '../../../../Views/confirmations/components/rows/percentage-row';
import { TotalRow } from '../../../../Views/confirmations/components/rows/total-row';
import {
  CustomAmountSkeleton
} from '../../../../Views/confirmations/components/transactions/custom-amount';
import { useAlerts } from '../../../../Views/confirmations/context/alert-system-context';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from '../../../../Views/confirmations/hooks/pay/useAutomaticTransactionPayToken';
import { useTransactionPayAvailableTokens } from '../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionPayMetrics } from '../../../../Views/confirmations/hooks/pay/useTransactionPayMetrics';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useAccountTokens } from '../../../../Views/confirmations/hooks/send/useAccountTokens';
import { useTransactionConfirm } from '../../../../Views/confirmations/hooks/transactions/useTransactionConfirm';
import { useTransactionCustomAmount } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import useClearConfirmationOnBackSwipe from '../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsInlineDeposit.styles';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
  hasMax?: boolean;
  preferredToken?: SetPayTokenRequest;
  overrideContent?: (amountHuman: string) => ReactNode;
  defaultValue?: string;
  skipNavigation?: boolean;
  tokenName?: string;
  onConfirmCallback?: (transactionMeta: TransactionMeta) => void;
}

export const PerpsInlineDeposit: React.FC<CustomAmountInfoProps> = memo(
  ({
    children,
    currency,
    disablePay,
    preferredToken,
    defaultValue,
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

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
    const availableTokens = useTransactionPayAvailableTokens();
    const hasTokens = availableTokens.length > 0;

    const isResultReady = useIsResultReady({
      isKeyboardVisible,
    });

    const {
      amountHumanDebounced,
      isInputChanged,
      updatePendingAmount,
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


    return (
      <Box >
        <Box>

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
              <PercentageRow />
            </Box>
          )}

          {!isResultReady && (
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
      onPress={() => {
        Alert.alert('Confirm');
        onConfirm();
      }}
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
