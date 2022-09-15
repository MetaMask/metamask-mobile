import React, { useCallback } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { setAutomaticSecurityChecks } from '../../../../../actions/security';

const AutomaticSecurityChecks = () => {
  const dispatch = useDispatch();
  const automaticSecurityChecksState = useSelector(
    (state: any) => state.security.automaticSecurityChecks,
  );

  const toggleAutomaticSecurityChecks = useCallback(
    (value: boolean) => {
      dispatch(setAutomaticSecurityChecks(value));
    },
    [dispatch],
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
