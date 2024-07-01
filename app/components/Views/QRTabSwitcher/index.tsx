/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
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
  disableTabber?: boolean;
  origin?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRTabSwitcherParams>(Routes.QR_TAB_SWITCHER);

const QRTabSwitcher = () => {
  const route = useRoute();
  const {
    onScanError,
    onScanSuccess,
    onStartScan,
    initialScreen,
    origin,
    disableTabber,
  } = route.params as QRTabSwitcherParams;

  const [selectedIndex, setSelectedIndex] = useState(
    initialScreen || Screens.Scanner,
  );
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const animatedValue = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: selectedIndex,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, selectedIndex]);

  const interpolateLeft = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

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
      ) : null}

      {selectedIndex === Screens.Receive ? (
        <ReceiveRequest
          navigation={navigation}
          hideModal={false}
          showReceiveModal
        />
      ) : null}

      <View style={styles.overlay}>
        {selectedIndex === Screens.Receive ? (
          <NavbarTitle title={'Receive'} translate={false} disableNetwork />
        ) : null}
        <TouchableOpacity style={styles.closeIcon} onPress={goBack}>
          <Icon name={'ios-close'} size={30} color={'black'} />
        </TouchableOpacity>
      </View>

      {disableTabber ? null : (
        <View style={styles.segmentedControlContainer}>
          <Animated.View
            style={[
              styles.segmentedControlItemSelected,
              { left: interpolateLeft },
            ]}
          />
          <TouchableWithoutFeedback
            onPress={() => setSelectedIndex(Screens.Scanner)}
          >
            <View style={styles.segmentedControlItem}>
              <Text style={styles.text}>Scan QR code</Text>
            </View>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPress={() => setSelectedIndex(Screens.Receive)}
          >
            <View style={styles.segmentedControlItem}>
              <Text style={styles.text}>My QR</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  );
};

export default QRTabSwitcher;
