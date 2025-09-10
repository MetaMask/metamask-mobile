import React, { useCallback, useMemo, useState } from 'react';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { PayTokenAmount } from '../../../../components/pay-token-amount';
import { TotalRow } from '../../../../components/rows/total-row';
import InfoSection from '../../../../components/UI/info-row/info-section/info-section';
import { BridgeTimeRow } from '../../../../components/rows/bridge-time-row';
import AlertBanner from '../../../../components/alert-banner';
import { usePerpsDepositView } from '../../hooks/usePerpsDepositView';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { usePerpsDepositAlerts } from '../../hooks/usePerpsDepositAlerts';
import { BridgeFeeRow } from '../../../../components/rows/bridge-fee-row';
import { useAlerts } from '../../../../context/alert-system-context';
import { AlertKeys } from '../../../../constants/alerts';

const KEYBOARD_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.SignedOrSubmitted,
  AlertKeys.PerpsHardwareAccount,
];

const PENDING_AMOUNT_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
];

export function PerpsDeposit() {
  useNavbar(strings('confirm.title.perps_deposit'));
  useClearConfirmationOnBackSwipe();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [pendingTokenAmount, setPendingTokenAmount] = useState<string>();
  const { alerts: confirmationAlerts } = useAlerts();
  const pendingAlerts = usePerpsDepositAlerts({ pendingTokenAmount });

  const filteredConfirmationAlerts = useMemo(
    () =>
      confirmationAlerts.filter(
        (a) => !PENDING_AMOUNT_ALERTS.includes(a.key as AlertKeys),
      ),
    [confirmationAlerts],
  );

  const alerts = useMemo(
    () =>
      [...pendingAlerts, ...filteredConfirmationAlerts].filter((a) =>
        KEYBOARD_ALERTS.includes(a.key as AlertKeys),
      ),
    [filteredConfirmationAlerts, pendingAlerts],
  );

  const { isFullView, isPayTokenSelected } = usePerpsDepositView({
    isKeyboardVisible,
  });

  const handleChange = useCallback((amount: string) => {
    setPendingTokenAmount(amount);
  }, []);

  const handleKeyboardShow = useCallback(() => {
    setIsKeyboardVisible(true);
  }, []);

  const handleKeyboardHide = useCallback(() => {
    setIsKeyboardVisible(false);
  }, []);

  const amountRenderCallback = useCallback(
    (amountHuman: string) => (
      <>
        <PayTokenAmount amountHuman={amountHuman} />
        {!isKeyboardVisible && isPayTokenSelected && (
          <AlertBanner
            blockingOnly
            excludeKeys={KEYBOARD_ALERTS}
            includeFields
            inline
          />
        )}
        <InfoSection>
          <PayWithRow />
        </InfoSection>
        {isFullView && (
          <InfoSection>
            <BridgeFeeRow />
            <BridgeTimeRow />
            <TotalRow />
          </InfoSection>
        )}
      </>
    ),
    [isKeyboardVisible, isPayTokenSelected, isFullView],
  );

  return (
    <>
      <EditAmount
        alerts={alerts}
        autoKeyboard
        isLoading={!isPayTokenSelected}
        onChange={handleChange}
        onKeyboardShow={handleKeyboardShow}
        onKeyboardHide={handleKeyboardHide}
      >
        {amountRenderCallback}
      </EditAmount>
    </>
  );
}
