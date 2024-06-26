/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { SafeAreaView, TouchableOpacity, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRScanner from '../QRScanner';
import ReceiveRequest from '../../UI/ReceiveRequest';
import { useTheme } from '../../../util/theme';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import NavbarTitle from '../../../components/UI/NavbarTitle';

export enum Screens {
  Scanner,
  Receive,
}
export interface QRTabSwitcherParams {
  onScanSuccess: (data: any, content?: string) => void;
  onScanError?: (error: string) => void;
  onStartScan?: (data: any) => Promise<void>;
  initialScreen?: Screens;
  origin?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRTabSwitcherParams>(Routes.QR_TAB_SWITCHER);

const QRTabSwitcher = () => {
  const route = useRoute();
  const { onScanError, onScanSuccess, onStartScan, initialScreen, origin } =
    route.params as QRTabSwitcherParams;

  const [selectedIndex, setSelectedIndex] = useState(
    initialScreen || Screens.Scanner,
  );
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const goBack = () => {
    navigation.goBack();
    try {
      onScanError?.('USER_CANCELLED');
    } catch (error) {
      console.warn(`Error setting onScanError: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {selectedIndex === Screens.Scanner ? (
        <QRScanner
          onScanError={onScanError}
          onScanSuccess={onScanSuccess}
          onStartScan={onStartScan}
          origin={origin}
        />
      ) : (
        <ReceiveRequest
          navigation={navigation}
          hideModal={false}
          showReceiveModal
        />
      )}

      {selectedIndex === Screens.Receive ? (
        <View style={styles.overlay}>
          <NavbarTitle title={'Receive'} translate={false} disableNetwork />
          <TouchableOpacity style={styles.closeIcon} onPress={goBack}>
            <Icon name={'ios-close'} size={30} color={'black'} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.segmentedControlContainer}>
        <TouchableOpacity
          style={[
            styles.segmentedControlItem,
            selectedIndex === 0 && styles.segmentedControlItemSelected,
          ]}
          onPress={() => setSelectedIndex(0)}
        >
          <Text
            style={
              selectedIndex === Screens.Scanner
                ? styles.selectedText
                : styles.text
            }
          >
            Scan QR code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentedControlItem,
            selectedIndex === 1 && styles.segmentedControlItemSelected,
          ]}
          onPress={() => setSelectedIndex(1)}
        >
          <Text
            style={
              selectedIndex === Screens.Receive
                ? styles.selectedText
                : styles.text
            }
          >
            My QR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QRTabSwitcher;
