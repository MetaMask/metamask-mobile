import React from 'react';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { Text } from 'react-native';

const DeleteWalletData = () => {
  const deleteWalletData = () => null;

  return (
    <SettingsButtonSection
      sectionTitle={strings('app_settings.delete_wallet_data_title')}
      sectionButtonText={strings('app_settings.delete_wallet_data_button')}
      modalTitleText={strings(
        'app_settings.delete_metrics_confirm_modal_title',
      )}
      modalDescriptionText={strings(
        'app_settings.delete_metrics_confirm_modal_description',
      )}
      modalConfirmButtonText={strings('app_settings.clear')}
      modalCancelButtonText={strings(
        'app_settings.reset_account_cancel_button',
      )}
      modalOnConfirm={deleteWalletData}
      descriptionText={
        <Text>{strings('app_settings.delete_wallet_data_description')}</Text>
      }
    />
  );
};

export default DeleteWalletData;
