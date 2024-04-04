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
  const { trackEvent } = useMetrics();
  const automaticSecurityChecksState = useSelector(
    (state: any) => state.security.automaticSecurityChecksEnabled,
  );

  const toggleAutomaticSecurityChecks = useCallback(
    (value: boolean) => {
      trackEvent(
        value
          ? MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_SETTINGS
          : MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_SETTINGS,
        { platform: Platform.OS },
      );
      dispatch(setAutomaticSecurityChecks(value));
    },
    [dispatch, trackEvent],
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
