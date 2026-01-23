import { TransactionMeta } from '@metamask/transaction-controller';
import React, { ReactNode, memo, useCallback, useEffect } from 'react';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import EngineService from '../../../../../core/EngineService';
import { Box } from '../../../../UI/Box/Box';
import { ConfirmationFooterSelectorIDs } from '../../../../Views/confirmations/ConfirmationView.testIds';
import { AlertMessage } from '../../../../Views/confirmations/components/alerts/alert-message';
import { BridgeFeeRow } from '../../../../Views/confirmations/components/rows/bridge-fee-row';
import { BridgeTimeRow } from '../../../../Views/confirmations/components/rows/bridge-time-row';
import { PayWithRow } from '../../../../Views/confirmations/components/rows/pay-with-row';
import { PercentageRow } from '../../../../Views/confirmations/components/rows/percentage-row';
import { TotalRow } from '../../../../Views/confirmations/components/rows/total-row';
import { InfoRowSkeleton } from '../../../../Views/confirmations/components/UI/info-row/info-row';
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
import { useTransactionConfirm } from '../../../../Views/confirmations/hooks/transactions/useTransactionConfirm';
import { useTransactionCustomAmount } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmountAlerts';
import useClearConfirmationOnBackSwipe from '../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';
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
  onConfirmCallback?: (transactionMeta: TransactionMeta) => void;
}

export const PerpsDepositFees = () => {
  const isResultReady = useIsResultReady();

  if (!isResultReady) {
    return (
      <Box>
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <BridgeFeeRow />
      <BridgeTimeRow />
      <TotalRow />
      <PercentageRow />
    </Box>
  );
};

export const PerpsInlineDeposit: React.FC<CustomAmountInfoProps> = memo(
  ({
    children,
    currency,
    disablePay,
    preferredToken,
    defaultValue,
    skipNavigation = false,
    onConfirmCallback,
  }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken({
      disable: disablePay,
      preferredToken,
    });
    useTransactionPayMetrics();

    const availableTokens = useTransactionPayAvailableTokens();
    const hasTokens = availableTokens.length > 0;

    const isResultReady = useIsResultReady();

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
      isKeyboardVisible: false,
      pendingTokenAmount: amountHumanDebounced,
    });

    const handleDone = useCallback(() => {
      updateTokenAmount();
      EngineService.flushState();
    }, [updateTokenAmount]);

    return (
      <Box>
        <Box>
          {children}
          {disablePay !== true && hasTokens && <PayWithRow hideNetworkFilter />}
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
                label={strings('perps.confirm')}
                onPress={handleDone}
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
              />
            </Box>
          )}

          <ConfirmButton
            alertTitle={alertTitle}
            skipNavigation={skipNavigation}
            onConfirmCallback={onConfirmCallback}
          />
        </Box>
      </Box>
    );
  },
);

function ConfirmButton({
  alertTitle,
  skipNavigation,
  onConfirmCallback,
}: Readonly<{
  alertTitle: string | undefined;
  skipNavigation?: boolean;
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

  const label = alertTitle ?? strings('perps.confirm');

  return (
    <Button
      style={[disabled && styles.disabledButton]}
      size={ButtonSize.Lg}
      label={label}
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      disabled={disabled}
      onPress={() => {
        onConfirm();
      }}
      testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
    />
  );
}

function useIsResultReady() {
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

  return isQuotesLoading || Boolean(quotes?.length) || !hasSourceAmount;
}
