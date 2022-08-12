import React from 'react';
import { StyleSheet, View } from 'react-native';
import Alert, { AlertType } from '../../Base/Alert';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
  alertBar: {
    width: '95%',
    marginBottom: 15,
  },
});

interface Props {
  /**
   * Function for dismissing of modal
   */
  onDismiss: () => void;
  /**
   * Navigation object needed to link to settings
   */
  navigation: any;
}

const CollectibleDetectionModal = ({ onDismiss, navigation }: Props) => {
  const goToSecuritySettings = () => {
    navigation.navigate('SettingsView', {
      screen: 'SettingsFlow',
      params: {
        screen: 'SecuritySettings',
        params: {
          scrollToBottom: true,
        },
      },
    });
  };

  return (
    <View style={styles.alertBar}>
      <Alert small onDismiss={onDismiss} type={AlertType.Info}>
        <Text infoModal bold small>
          {strings('wallet.nfts_autodetection_title')}
        </Text>
        {'\n'}
        <Text infoModal small>
          {strings('wallet.nfts_autodetection_desc')}
        </Text>
        {'\n'}
        <Text infoModal link bold small onPress={goToSecuritySettings}>
          {strings('wallet.nfts_autodetection_cta')}
        </Text>
      </Alert>
    </View>
  );
};

export default CollectibleDetectionModal;
