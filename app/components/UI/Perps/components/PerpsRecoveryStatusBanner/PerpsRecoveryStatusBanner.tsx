import React from 'react';

import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsRecoveryStatus } from '../../hooks/usePerpsRecoveryStatus';

interface PerpsRecoveryStatusBannerProps {
  testID?: string;
}

/**
 * Surfaces the active perps provider's durable-settlement safety state:
 * - TP/SL protections parked for explicit manual re-establishment.
 * - Recovered dispatch outcomes that block writes until acknowledged.
 *
 * Renders nothing when there is nothing pending (the common case, and
 * every provider without durable settlement state).
 */
const PerpsRecoveryStatusBanner: React.FC<PerpsRecoveryStatusBannerProps> = ({
  testID = 'perps-recovery-status-banner',
}) => {
  const { pendingManualRecoveries, recoveredDispatches, acknowledge } =
    usePerpsRecoveryStatus();

  const firstDispatch = recoveredDispatches[0];
  const firstManual = pendingManualRecoveries[0];

  if (!firstDispatch && !firstManual) {
    return null;
  }

  return (
    <>
      {firstDispatch ? (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          title={strings('perps.recovery_status.dispatch_title')}
          description={strings(
            firstDispatch.outcome === 'succeeded'
              ? 'perps.recovery_status.dispatch_description'
              : 'perps.recovery_status.dispatch_unknown_description',
            { intent: firstDispatch.intent },
          )}
          actionButtonLabel={strings('perps.recovery_status.acknowledge')}
          actionButtonOnPress={() => {
            // The user has the refreshed surface in front of them; this
            // acknowledges exactly the outcome being shown.
            acknowledge(firstDispatch.recoveryId).catch(() => {
              // Hook records the failure; banner re-renders from state.
            });
          }}
          testID={`${testID}-dispatch`}
        />
      ) : null}
      {firstManual ? (
        <BannerAlert
          severity={BannerAlertSeverity.Danger}
          title={strings('perps.recovery_status.manual_title')}
          description={strings('perps.recovery_status.manual_description', {
            symbol: firstManual.symbol,
          })}
          testID={`${testID}-manual`}
        />
      ) : null}
    </>
  );
};

export default PerpsRecoveryStatusBanner;
