import React, { useCallback } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { setShouldShowConsentSheet } from '../../../../../actions/security';
import {
  selectShouldShowConsentSheet,
  selectDataSharingPreference,
} from '../../../../../selectors/security';
import { SUPPORT_CONSENT_PREFERENCE_TOGGLE } from '../SecuritySettings.constants';

const SupportConsentPreferenceSection = () => {
  const dispatch = useDispatch();
  const shouldShowConsentSheet = useSelector(selectShouldShowConsentSheet);
  const dataSharingPreference = useSelector(selectDataSharingPreference);

  const toggleShouldShowConsentSheet = useCallback(
    (value: boolean) => {
      dispatch(setShouldShowConsentSheet(!value)); // Invert: toggle ON means shouldShowConsentSheet = false
    },
    [dispatch],
  );

  const getDescription = useCallback(() => {
    const baseDescription = strings('support_consent_preference.description');

    if (dataSharingPreference === null) {
      return baseDescription;
    }

    const dataSharingText = dataSharingPreference
      ? strings('support_consent_preference.currently_sharing')
      : strings('support_consent_preference.currently_not_sharing');

    return `${baseDescription} ${dataSharingText}`;
  }, [dataSharingPreference]);

  return (
    <SecurityOptionToggle
      title={strings('support_consent_preference.title')}
      description={getDescription()}
      value={!shouldShowConsentSheet} // Toggle is ON when we should NOT show consent sheet
      onOptionUpdated={toggleShouldShowConsentSheet}
      testId={SUPPORT_CONSENT_PREFERENCE_TOGGLE}
    />
  );
};

export default React.memo(SupportConsentPreferenceSection);
