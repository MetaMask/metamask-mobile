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
import { useSelector } from 'react-redux';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../../reducers';
import { useTransactionPayTokenAmounts } from '../../../hooks/pay/useTransactionPayTokenAmounts';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export interface CustomAmountInfoProps {
  currency?: string;
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({ currency }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken();

    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setKeyboardVisible] = useState(true);
    const { setIsFooterVisible } = useConfirmationContext();

    const isResultReady = useIsResultReady({
      isKeyboardVisible,
    });

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
            currency={currency}
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
          />
        )}
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
  const transactionMeta = useTransactionMetadataRequest();
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();
  const transactionId = transactionMeta?.id ?? '';

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  return (
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || sourceAmounts?.length === 0)
  );
}
