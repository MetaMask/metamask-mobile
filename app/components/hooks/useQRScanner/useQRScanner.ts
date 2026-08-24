import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { Authentication } from '../../../core';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../useAnalytics/useAnalytics';

/** Payload the QR tab switcher hands back on a successful scan. */
export interface QRScanResult {
  private_key?: string;
  seed?: string;
}

/**
 * Opens the QR tab switcher and handles the three scan outcomes: a private key
 * (offer to import), a seed phrase (refuse — importing one requires a logout),
 * and anything else (hand to the deeplink parser).
 *
 * @returns `openQRScanner`, ready to wire to a button press.
 */
export function useQRScanner(): { openQRScanner: () => void } {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const onScanSuccess = useCallback(
    (data: QRScanResult, content?: string) => {
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
      } else if (data.seed) {
        Alert.alert(
          strings('wallet.error'),
          strings('wallet.logout_to_import_seed'),
        );
      } else {
        setTimeout(() => {
          DeeplinkManager.parse(content ?? '', {
            origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
          });
        }, 500);
      }
    },
    [navigation],
  );

  const openQRScanner = useCallback(() => {
    // Broader ScanSuccess param; avoid cross-route type import (ADR-0020).
    navigateWithDetails(navigation, [
      Routes.QR_TAB_SWITCHER,
      { onScanSuccess },
    ]);
    trackEvent(createEventBuilder(EVENT_NAME.QR_SCANNER_OPENED).build());
  }, [navigation, onScanSuccess, trackEvent, createEventBuilder]);

  return { openQRScanner };
}
