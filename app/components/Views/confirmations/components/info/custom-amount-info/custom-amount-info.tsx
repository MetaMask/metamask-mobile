import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';
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
import styleSheet from './custom-amount-info.styles';
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
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
} from '../../../hooks/pay/useTransactionPayData';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
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
      <Box style={styles.container}>
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
          {disablePay !== true && <PayWithRow />}
          {isKeyboardVisible && <AlertMessage alertMessage={alertMessage} />}
        </Box>
        <>
          {isResultReady && (
            <Box>
              <BridgeFeeRow />
              <BridgeTimeRow />
              <TotalRow />
            </Box>
          )}
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
        </>
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
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
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();

  return (
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || !sourceAmounts?.length)
  );
}
