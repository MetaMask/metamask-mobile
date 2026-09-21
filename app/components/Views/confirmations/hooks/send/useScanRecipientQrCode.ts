import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';

import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  createQRScannerNavDetails,
  QRTabSwitcherScreens,
  type ScanSuccess,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../../QRTabSwitcher';

interface UseScanRecipientQrCodeParams {
  onAddressScanned: (address: string) => void;
}

export const useScanRecipientQrCode = ({
  onAddressScanned,
}: UseScanRecipientQrCodeParams) => {
  const { navigate } = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleScanSuccess = useCallback(
    (data: ScanSuccess) => {
      if (data.target_address) {
        onAddressScanned(data.target_address);
      }
    },
    [onAddressScanned],
  );

  const openScanner = useCallback(() => {
    trackEvent(createEventBuilder(MetaMetricsEvents.QR_SCANNER_OPENED).build());

    // createQRScannerNavDetails returns a [routeName: string, params] tuple, so
    // the route name isn't a compile-time literal.
    navigateWithDetails(
      { navigate },
      createQRScannerNavDetails({
        initialScreen: QRTabSwitcherScreens.Scanner,
        disableTabber: true,
        onScanSuccess: handleScanSuccess,
        origin: Routes.SEND_FLOW.SEND_TO,
      }),
    );
  }, [createEventBuilder, handleScanSuccess, navigate, trackEvent]);

  return { openScanner };
};
