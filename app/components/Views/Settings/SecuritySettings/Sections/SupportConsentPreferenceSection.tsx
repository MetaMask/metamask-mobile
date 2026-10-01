import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { setShouldShowConsentSheet } from '../../../../../actions/security';
import {
  selectDataSharingPreference,
  selectShouldShowConsentSheet,
} from '../../../../../selectors/security';
import { SUPPORT_CONSENT_PREFERENCE_TOGGLE } from '../SecuritySettings.constants';

const SupportConsentPreferenceSection = () => {
  const dispatch = useDispatch();
  const shouldShowConsentSheet = useSelector(selectShouldShowConsentSheet);
  const dataSharingPreference = useSelector(selectDataSharingPreference);

  // The toggle is "remember my preference", i.e. the inverse of shouldShowConsentSheet.
  const toggleRememberPreference = useCallback(
    (rememberPreference: boolean) => {
      dispatch(setShouldShowConsentSheet(!rememberPreference));
    },
    [dispatch],
  );

  const baseDescription = strings('support_consent_preference.description');
  let description = baseDescription;
  if (dataSharingPreference !== null) {
    const currentDecision = dataSharingPreference
      ? strings('support_consent_preference.currently_sharing')
      : strings('support_consent_preference.currently_not_sharing');
    description = `${baseDescription} ${currentDecision}`;
  }

  return (
    <SecurityOptionToggle
      title={strings('support_consent_preference.title')}
      description={description}
      value={!shouldShowConsentSheet}
      onOptionUpdated={toggleRememberPreference}
      testId={SUPPORT_CONSENT_PREFERENCE_TOGGLE}
    />
  );
};

export default React.memo(SupportConsentPreferenceSection);
