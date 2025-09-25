import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import { usePerpsEventTracking } from '../../../../../../UI/Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../../../../../UI/Perps/constants/eventNames';

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
  const { track } = usePerpsEventTracking();

  const { isFullView, isPayTokenSelected } = usePerpsDepositView({
    isKeyboardVisible,
  });

  // Track funding input viewed on mount
  useEffect(() => {
    track(MetaMetricsEvents.PERPS_FUNDING_INPUT_VIEWED, {
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
    });
  }, [track]);

  // Track funding review viewed when transaction details are ready to review
  useEffect(() => {
    if (isFullView && isPayTokenSelected) {
      track(MetaMetricsEvents.PERPS_FUNDING_REVIEW_VIEWED, {
        [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
      });
    }
  }, [isFullView, isPayTokenSelected, track]);

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

  const handleChange = useCallback((amount: string) => {
    setPendingTokenAmount(amount);
  }, []);

  return (
    <>
      <EditAmount
        alerts={alerts}
        autoKeyboard
        isLoading={!isPayTokenSelected}
        onChange={handleChange}
        onKeyboardShow={() => setIsKeyboardVisible(true)}
        onKeyboardHide={() => setIsKeyboardVisible(false)}
      >
        {(amountHuman) => (
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
        )}
      </EditAmount>
    </>
  );
}
