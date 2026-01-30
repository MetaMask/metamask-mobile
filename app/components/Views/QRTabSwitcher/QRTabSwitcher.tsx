import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import QRScanner from '../QRScanner';
import { useTheme } from '../../../util/theme';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import HeaderBase from '../../../component-library/components/HeaderBase';
import { endTrace, trace, TraceName } from '../../../util/trace';

export enum QRTabSwitcherScreens {
  Scanner,
}

export interface ScanSuccess {
  content?: string;
  chain_id?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

export interface StartScan {
  content?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

const USER_CANCELLED = 'USER_CANCELLED';

export interface QRTabSwitcherParams {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onStartScan?: (data: StartScan) => Promise<void>;
  onScanError?: (error: string) => void;
  initialScreen?: QRTabSwitcherScreens;
  disableTabber?: boolean;
  origin?: string;
  networkName?: string;
}

export const createQRScannerNavDetails = createNavigationDetails(
  Routes.QR_TAB_SWITCHER,
);

const QRTabSwitcher = () => {
  // Start tracing component loading
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    trace({ name: TraceName.QRTabSwitcher });
  }

  const route = useRoute();
  const { onScanError, onScanSuccess, onStartScan, origin } =
    route.params as QRTabSwitcherParams;

  // QR scanner displays camera view for scanning codes
  const selectedIndex = QRTabSwitcherScreens.Scanner;
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  // End trace when component has finished initial loading
  useEffect(() => {
    endTrace({ name: TraceName.QRTabSwitcher });
    isFirstRender.current = false;
  }, []);

  const goBack = () => {
    navigation.goBack();
    try {
      onScanError?.(USER_CANCELLED);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Error setting onScanError: ${error.message}`);
      } else {
        console.warn('An unknown error occurred');
      }
    }
  };

  return (
    <View style={styles.container}>
      {selectedIndex === QRTabSwitcherScreens.Scanner ? (
        <QRScanner
          onScanError={onScanError}
          onScanSuccess={onScanSuccess}
          onStartScan={onStartScan}
          origin={origin}
        />
      ) : null}

      <View style={styles.overlay}>
        <HeaderBase
          style={styles.header}
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Md}
              onPress={goBack}
            />
          }
        ></HeaderBase>
      </View>

      {/* QR scanner interface - camera view only */}
    </View>
  );
};

export default QRTabSwitcher;
