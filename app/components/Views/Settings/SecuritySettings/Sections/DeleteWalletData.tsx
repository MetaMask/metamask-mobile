import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

const DeleteWalletData = () => {
  const navigation = useNavigation();

  const showDeleteWalletModal = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  return (
    <SettingsButtonSection
      sectionTitle={strings('app_settings.delete_wallet_data_title')}
      sectionButtonText={strings('app_settings.delete_wallet_data_button')}
      needsModal={false}
      descriptionText={
        <Text>{strings('app_settings.delete_wallet_data_description')}</Text>
      }
      onPress={showDeleteWalletModal}
    />
  );
};

export default DeleteWalletData;
