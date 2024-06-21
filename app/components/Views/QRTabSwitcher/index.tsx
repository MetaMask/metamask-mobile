/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRScanner from '../QRScanner';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export interface QRTabSwitcherParams {
  onScanSuccess: (data: any, content?: string) => void;
  onScanError?: (error: string) => void;
  onStartScan?: (data: any) => Promise<void>;
  origin?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRTabSwitcherParams>(Routes.QR_TAB_SWITCHER);

const QRTabSwitcher = () => {
  const { onScanError, onScanSuccess, onStartScan, origin } =
    useParams<QRTabSwitcherParams>();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const goBack = useCallback(() => {
    navigation.goBack();
    try {
      onScanError?.('USER_CANCELLED');
    } catch (error: any) {
      console.warn(`Error setting onScanError: ${error.message}`);
    }
  }, [onScanError, navigation]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.overlayContainerColumn}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeIcon} onPress={goBack}>
            <Icon name={'ios-close'} size={30} color={'black'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <QRScanner
        onScanError={onScanError}
        onScanSuccess={onScanSuccess}
        onStartScan={onStartScan}
        origin={origin}
      />
    </View>
  );
};

export default QRTabSwitcher;
