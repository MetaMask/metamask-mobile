import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

export interface QRScanResult {
  private_key?: string;
  seed?: string;
}

export const handleQRScanSuccess = ({
  data,
  content,
  navigation,
}: {
  data: QRScanResult;
  content?: string;
  navigation: AppNavigationProp;
}) => {
  if (data.private_key) {
    const privateKey = data.private_key;
    Alert.alert(
      strings('wallet.private_key_detected'),
      strings('wallet.do_you_want_to_import_this_account'),
      [
        {
          text: strings('wallet.cancel'),
          onPress: () => false,
          style: 'cancel',
        },
        {
          text: strings('wallet.yes'),
          onPress: async () => {
            try {
              await Authentication.importAccountFromPrivateKey(privateKey);
              navigation.navigate('ImportPrivateKeyView', {
                screen: 'ImportPrivateKeySuccess',
              });
            } catch {
              Alert.alert(
                strings('import_private_key.error_title'),
                strings('import_private_key.error_message'),
              );
            }
          },
        },
      ],
      { cancelable: false },
    );
    return;
  }

  if (data.seed) {
    Alert.alert(
      strings('wallet.error'),
      strings('wallet.logout_to_import_seed'),
    );
    return;
  }

  setTimeout(() => {
    DeeplinkManager.parse(content ?? '', {
      origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
    });
  }, 500);
};
