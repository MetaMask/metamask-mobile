import React, { useCallback, useState } from 'react';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { PayTokenAmount } from '../../../../components/pay-token-amount';
import { TotalRow } from '../../../../components/rows/total-row';
import InfoSection from '../../../../components/UI/info-row/info-section/info-section';
import { BridgeTimeRow } from '../../../../components/rows/bridge-time-row';
import { RowAlertKey } from '../../../../components/UI/info-row/alert-row/constants';
import AlertBanner from '../../../../components/alert-banner';
import { usePerpsDepositView } from '../../hooks/usePerpsDepositView';
import { GasFeeFiatRow } from '../../../../components/rows/transactions/gas-fee-fiat-row';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { usePerpsDepositAlerts } from '../../hooks/usePerpsDepositAlerts';
import { BridgeFeeRow } from '../../../../components/rows/bridge-fee-row';

export function PerpsDeposit() {
  useNavbar(strings('confirm.title.perps_deposit'));
  useClearConfirmationOnBackSwipe();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [pendingTokenAmount, setPendingTokenAmount] = useState<string>();
  const alerts = usePerpsDepositAlerts({ pendingTokenAmount });

  const { isFullView, isPayTokenSelected } = usePerpsDepositView({
    isKeyboardVisible,
  });

  const handleChange = useCallback((amount: string) => {
    setPendingTokenAmount(amount);
  }, []);

  return (
    <>
      <EditAmount
        alerts={alerts}
        autoKeyboard
        onChange={handleChange}
        onKeyboardShow={() => setIsKeyboardVisible(true)}
        onKeyboardHide={() => setIsKeyboardVisible(false)}
      >
        {(amountHuman) => (
          <>
            <PayTokenAmount amountHuman={amountHuman} />
            {!isKeyboardVisible && isPayTokenSelected && (
              <AlertBanner
                blockingFields
                excludeFields={[RowAlertKey.Amount]}
                inline
              />
            )}
            <InfoSection>
              <PayWithRow />
            </InfoSection>
            {isFullView && (
              <InfoSection>
                <GasFeeFiatRow />
                <BridgeFeeRow />
                <BridgeTimeRow />
                <TotalRow />
              </InfoSection>
            )}
          </>
        )}
      </EditAmount>
    </>
  );
}
