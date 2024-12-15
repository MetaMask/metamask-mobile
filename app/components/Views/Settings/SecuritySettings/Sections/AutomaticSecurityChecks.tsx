import React, { useCallback } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { setAutomaticSecurityChecks } from '../../../../../actions/security';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

import { Platform } from 'react-native';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

const AutomaticSecurityChecks = () => {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const automaticSecurityChecksState = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.automaticSecurityChecksEnabled,
  );

  const toggleAutomaticSecurityChecks = useCallback(
    (value: boolean) => {
      trackEvent(
        createEventBuilder(
          value
            ? MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_SETTINGS
            : MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_SETTINGS,
        )
          .addProperties({ platform: Platform.OS })
          .build(),
      );
      dispatch(setAutomaticSecurityChecks(value));
    },
    [dispatch, trackEvent, createEventBuilder],
  );
  return (
    <SecurityOptionToggle
      title={strings(`automatic_security_checks.title`)}
      description={strings(`automatic_security_checks.description`)}
      value={automaticSecurityChecksState}
      onOptionUpdated={toggleAutomaticSecurityChecks}
    />
  );
};

export default React.memo(AutomaticSecurityChecks);
