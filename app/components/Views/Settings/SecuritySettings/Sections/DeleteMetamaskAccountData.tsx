import React from 'react';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Linking } from 'react-native';
import {
  CONSENSYS_PRIVACY_POLICY,
  DELETE_ACCOUNT_DATA_FORM_URL,
} from '../../../../../constants/urls';
import { selectSeedlessOnboardingLoginFlow } from '../../../../../selectors/seedlessOnboardingController';
import { useSelector } from 'react-redux';

const DeleteMetamaskAccountData = () => {
  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);
  const openDeleteAccountDataLink = () =>
    Linking.openURL(DELETE_ACCOUNT_DATA_FORM_URL);
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  if (!isSocialLogin) {
    return null;
  }

  return (
    <SettingsButtonSection
      testID="delete-metamask-account-data-button"
      needsModal={false}
      sectionTitle={strings('app_settings.delete_metamask_account_data_title')}
      sectionButtonText={strings(
        'app_settings.delete_metamask_account_data_button',
      )}
      onPress={openDeleteAccountDataLink}
      descriptionText={
        <>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('app_settings.delete_metamask_account_data_description')}
          </Text>{' '}
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Auto}
            onPress={openPrivacyPolicy}
            label={strings(
              'app_settings.delete_metamask_account_data_description_privacy_policy',
            )}
          />
        </>
      }
    />
  );
};

export default React.memo(DeleteMetamaskAccountData);
