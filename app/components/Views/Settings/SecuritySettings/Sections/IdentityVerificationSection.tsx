import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import { SECURITY_SETTINGS_IDENTITY_VERIFICATION_BUTTON } from '../SecuritySettings.constants';

/**
 * Entry point to the identity-verification screen, which shows the customer's
 * verification status and the vendors their identity data has been shared
 * with.
 *
 * Hidden unless the customer has actually started KYC: the screen has nothing
 * to say otherwise.
 */
const IdentityVerificationSection = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isEnabled: isNeobankEnabled } = useSelector(
    selectMoneyMovementNeobank,
  );
  const kycSessionStatus = useSelector(selectKycSessionStatus);

  if (!isNeobankEnabled || !kycSessionStatus) {
    return null;
  }

  const openIdentityVerification = () => {
    navigation.navigate(Routes.SETTINGS.IDENTITY_VERIFICATION);
  };

  return (
    <SettingsButtonSection
      sectionTitle={strings('identity_verification.title')}
      sectionButtonText={strings('identity_verification.section_button')}
      descriptionText={strings('identity_verification.settings_description')}
      needsModal={false}
      testID={SECURITY_SETTINGS_IDENTITY_VERIFICATION_BUTTON}
      onPress={openIdentityVerification}
    />
  );
};

export default IdentityVerificationSection;
