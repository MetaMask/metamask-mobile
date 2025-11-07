import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import InfoSection from '../../UI/info-row/info-section';
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
import styleSheet, { BOTTOM_VISUAL_PADDING } from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import AlertBanner from '../../alert-banner';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useAutomaticTransactionPayToken } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { AlertMessage } from '../../alerts/alert-message';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import { useSelector } from 'react-redux';
import { selectTransactionBridgeQuotesById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../../reducers';
import { useTransactionPayTokenAmounts } from '../../../hooks/pay/useTransactionPayTokenAmounts';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
}

/**
 * Custom hook to create container style with dynamic bottom padding
 * Combines safe area insets with visual padding for Android 3-button navigation
 */
function useContainerStyleWithBottomPadding(
  containerStyle: Record<string, unknown>,
) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      ...containerStyle,
      paddingBottom: insets.bottom + BOTTOM_VISUAL_PADDING,
    }),
    [containerStyle, insets.bottom],
  );
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({ children, currency, disablePay }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken({ disable: disablePay });

    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setKeyboardVisible] = useState(true);
    const { setIsFooterVisible } = useConfirmationContext();

    const isResultReady = useIsResultReady({
      isKeyboardVisible,
    });

    // Dynamic bottom padding: safe area inset + visual padding
    const containerStyle = useContainerStyleWithBottomPadding(styles.container);

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

    const { alertMessage, keyboardAlertMessage, excludeBannerKeys } =
      useTransactionCustomAmountAlerts({
        isInputChanged,
        pendingTokenAmount: amountHumanDebounced,
      });

    useEffect(() => {
      setIsFooterVisible(!isKeyboardVisible);
    }, [isKeyboardVisible, setIsFooterVisible]);

    const handleDone = useCallback(async () => {
      await updateTokenAmount();
      setKeyboardVisible(false);
    }, [updateTokenAmount]);

    const handleAmountPress = useCallback(() => {
      setKeyboardVisible(true);
    }, []);

    return (
      <Box style={containerStyle}>
        <Box>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(keyboardAlertMessage)}
            onPress={handleAmountPress}
          />
          {disablePay !== true && <PayTokenAmount amountHuman={amountHuman} />}
          {children}
          {!isKeyboardVisible && (
            <AlertBanner
              blockingOnly
              excludeKeys={excludeBannerKeys}
              includeFields
              inline
            />
          )}
          {disablePay !== true && (
            <InfoSection>
              <PayWithRow />
            </InfoSection>
          )}
          {isKeyboardVisible && <AlertMessage alertMessage={alertMessage} />}
          {isResultReady && (
            <>
              <InfoSection>
                <BridgeFeeRow />
                <BridgeTimeRow />
                <TotalRow />
              </InfoSection>
            </>
          )}
        </Box>
        {isKeyboardVisible && (
          <DepositKeyboard
            alertMessage={keyboardAlertMessage}
            value={amountFiat}
            onChange={updatePendingAmount}
            onDonePress={handleDone}
            onPercentagePress={updatePendingAmountPercentage}
            hasInput={hasInput}
          />
        )}
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  // Dynamic bottom padding: safe area inset + visual padding (same as CustomAmountInfo)
  const containerStyle = useContainerStyleWithBottomPadding(styles.container);

  return (
    <Box style={containerStyle}>
      <Box>
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
        <InfoSection>
          <PayWithRowSkeleton />
        </InfoSection>
      </Box>
      <DepositKeyboardSkeleton />
    </Box>
  );
}

function useIsResultReady({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  const transactionMeta = useTransactionMetadataRequest();
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();
  const transactionId = transactionMeta?.id ?? '';
  const { isLoading } = useIsTransactionPayLoading();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  return (
    !isKeyboardVisible &&
    (isLoading || Boolean(quotes?.length) || !sourceAmounts?.length)
  );
}
