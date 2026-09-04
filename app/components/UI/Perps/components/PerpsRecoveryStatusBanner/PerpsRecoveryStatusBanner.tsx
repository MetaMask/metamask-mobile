import React, { useCallback, useRef, useState } from 'react';

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
  const acknowledgingIdsRef = useRef(new Set<string>());
  const [acknowledgingIds, setAcknowledgingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const handleAcknowledge = useCallback(
    (recoveryId: string) => {
      if (acknowledgingIdsRef.current.has(recoveryId)) {
        return;
      }
      acknowledgingIdsRef.current.add(recoveryId);
      setAcknowledgingIds(new Set(acknowledgingIdsRef.current));
      acknowledge(recoveryId)
        .catch(() => {
          // Hook records the original failure for diagnostics and UI state.
        })
        .finally(() => {
          acknowledgingIdsRef.current.delete(recoveryId);
          setAcknowledgingIds(new Set(acknowledgingIdsRef.current));
        });
    },
    [acknowledge],
  );

  if (
    recoveredDispatches.length === 0 &&
    pendingManualRecoveries.length === 0 &&
    !error
  ) {
    return null;
  }

  return (
    <>
      {error ? (
        <BannerAlert
          severity={BannerAlertSeverity.Danger}
          title={strings('perps.recovery_status.error_title')}
          description={strings('perps.recovery_status.error_description')}
          testID={`${testID}-error`}
        />
      ) : null}
      {recoveredDispatches.map((dispatch, index) => {
        const dispatchTestID = `${testID}-dispatch${
          index === 0 ? '' : `-${index}`
        }`;
        return (
          <BannerAlert
            key={dispatch.recoveryId}
            severity={BannerAlertSeverity.Warning}
            title={strings('perps.recovery_status.dispatch_title')}
            description={strings(
              dispatch.outcome === 'succeeded'
                ? 'perps.recovery_status.dispatch_description'
                : 'perps.recovery_status.dispatch_unknown_description',
              { intent: dispatch.intent },
            )}
            actionButtonLabel={strings('perps.recovery_status.acknowledge')}
            actionButtonOnPress={() => handleAcknowledge(dispatch.recoveryId)}
            actionButtonProps={{
              isDisabled: acknowledgingIds.has(dispatch.recoveryId),
              testID: `${dispatchTestID}-acknowledge`,
            }}
            testID={dispatchTestID}
          />
        );
      })}
      {pendingManualRecoveries.map((manualRecovery, index) => (
        <BannerAlert
          key={manualRecovery.settlementKey}
          severity={BannerAlertSeverity.Danger}
          title={strings('perps.recovery_status.manual_title')}
          description={strings('perps.recovery_status.manual_description', {
            symbol: manualRecovery.symbol,
          })}
          testID={`${testID}-manual${index === 0 ? '' : `-${index}`}`}
        />
      ))}
    </>
  );
};

export default PerpsRecoveryStatusBanner;
