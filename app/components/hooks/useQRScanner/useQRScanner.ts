import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { handleQRScanSuccess, type QRScanResult } from './handleQRScanSuccess';

/** Payload the QR tab switcher hands back on a successful scan. */
export type { QRScanResult } from './handleQRScanSuccess';

/** Opens the QR tab switcher; scans resolve to private-key import, seed-phrase refusal, or the deeplink parser. */
export function useQRScanner(): { openQRScanner: () => void } {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const onScanSuccess = useCallback(
    (data: QRScanResult, content?: string) => {
      handleQRScanSuccess({ data, content, navigation });
    },
    [navigation],
  );

  const openQRScanner = useCallback(() => {
    navigateWithDetails(navigation, [
      Routes.QR_TAB_SWITCHER,
      { onScanSuccess },
    ]);
    trackEvent(createEventBuilder(EVENT_NAME.QR_SCANNER_OPENED).build());
  }, [navigation, onScanSuccess, trackEvent, createEventBuilder]);

  return { openQRScanner };
}
