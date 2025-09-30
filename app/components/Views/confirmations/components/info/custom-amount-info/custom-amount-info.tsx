import React, { useCallback, useEffect, useState } from 'react';
import { EditAmount } from '../../edit-amount-2/edit-amount-2';
import { PayTokenAmount } from '../../pay-token-amount';
import InfoSection from '../../UI/info-row/info-section';
import { PayWithRow } from '../../rows/pay-with-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import { DepositKeyboard } from '../../deposit-keyboard';
import { noop } from 'lodash';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import AlertBanner from '../../alert-banner';
import useNavbar from '../../../hooks/ui/useNavbar';
import { strings } from '../../../../../../../locales/i18n';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useAutomaticTransactionPayToken } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { AlertMessage } from '../../alerts/alert-message';

export function CustomAmountInfo() {
  useNavbar(strings('confirm.title.perps_deposit'));
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

  return (
    <Box style={styles.container}>
      <Box>
        <EditAmount
          amountFiat={amountFiat}
          hasAlert={Boolean(keyboardAlertMessage)}
          onPress={() => setKeyboardVisible(true)}
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
          hasInput={false}
          onChange={updatePendingAmount}
          onDonePress={handleDone}
          onPercentagePress={noop}
        />
      )}
    </Box>
  );
}
