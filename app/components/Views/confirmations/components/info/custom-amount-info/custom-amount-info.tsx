import React, { memo, useCallback, useEffect, useState } from 'react';
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

export const CustomAmountInfo = memo(() => {
  useClearConfirmationOnBackSwipe();
  useAutomaticTransactionPayToken();

  const { styles } = useStyles(styleSheet, {});
  const [isKeyboardVisible, setKeyboardVisible] = useState(true);
  const { setIsFooterVisible } = useConfirmationContext();

  const {
    amountFiat,
    amountHuman,
    isInputChanged,
    updatePendingAmount,
    updatePendingAmountPercentage,
    updateTokenAmount,
  } = useTransactionCustomAmount();

  const { alertMessage, keyboardAlertMessage, excludeBannerKeys } =
    useTransactionCustomAmountAlerts({
      isInputChanged,
      pendingTokenAmount: amountHuman,
    });

  useEffect(() => {
    setIsFooterVisible(!isKeyboardVisible);
  }, [isKeyboardVisible, setIsFooterVisible]);

  const handleDone = useCallback(() => {
    updateTokenAmount();
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
          hasAlert={Boolean(keyboardAlertMessage)}
          onPress={handleAmountPress}
        />
        <PayTokenAmount amountHuman={amountHuman} />
        {!isKeyboardVisible && (
          <AlertBanner
            blockingOnly
            excludeKeys={excludeBannerKeys}
            includeFields
            inline
          />
        )}
        <InfoSection>
          <PayWithRow />
        </InfoSection>
        {isKeyboardVisible && <AlertMessage alertMessage={alertMessage} />}
        {!isKeyboardVisible && (
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
        />
      )}
    </Box>
  );
});

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
