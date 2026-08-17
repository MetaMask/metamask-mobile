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
 * TP/SL protections parked for explicit manual re-establishment,
 * recovered dispatch outcomes that block writes until acknowledged, and
 * read/acknowledgment failures — storage corruption must be VISIBLE,
 * never silently rendered as "nothing pending".
 *
 * Renders nothing only when there is genuinely nothing pending and no
 * error (the common case, and every provider without durable state).
 */
const PerpsRecoveryStatusBanner: React.FC<PerpsRecoveryStatusBannerProps> = ({
  testID = 'perps-recovery-status-banner',
}) => {
  const { pendingManualRecoveries, recoveredDispatches, error, acknowledge } =
    usePerpsRecoveryStatus();

  const firstDispatch = recoveredDispatches[0];
  const firstManual = pendingManualRecoveries[0];

  if (!firstDispatch && !firstManual && !error) {
    return null;
  }

  return (
    <>
      {error ? (
        <BannerAlert
          severity={BannerAlertSeverity.Danger}
          title={strings('perps.recovery_status.error_title')}
          description={error.message}
          testID={`${testID}-error`}
        />
      ) : null}
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
            // acknowledges exactly the outcome being shown. A failure
            // stays visible via the hook's error state, and the banner
            // (with its action) remains rendered and actionable.
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
