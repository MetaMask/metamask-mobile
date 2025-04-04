import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableWithoutFeedback } from 'react-native';
import QRScanner from '../QRScanner';
import { strings } from '../../../../locales/i18n';
import ReceiveRequest from '../../UI/ReceiveRequest';
import { useTheme } from '../../../util/theme';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import NavbarTitle from '../../../components/UI/NavbarTitle';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import HeaderBase from '../../../component-library/components/HeaderBase';

export enum QRTabSwitcherScreens {
  Scanner,
  Receive,
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
    networkName,
  } = route.params as QRTabSwitcherParams;

  const [selectedIndex, setSelectedIndex] = useState(
    initialScreen || QRTabSwitcherScreens.Scanner,
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

      {selectedIndex === QRTabSwitcherScreens.Receive ? (
        <ReceiveRequest
          navigation={navigation}
          hideModal={() => false}
          showReceiveModal
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
        >
          {selectedIndex === QRTabSwitcherScreens.Receive ? (
            <NavbarTitle
              // @ts-expect-error proptypes components requires ts-expect-error
              title={strings(`receive.title`)}
              // @ts-expect-error proptypes components requires ts-expect-error
              translate={false}
              // @ts-expect-error proptypes components requires ts-expect-error
              disableNetwork
              // @ts-expect-error proptypes components requires ts-expect-error
              networkName={networkName}
            />
          ) : null}
        </HeaderBase>
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
            onPress={() => setSelectedIndex(QRTabSwitcherScreens.Scanner)}
          >
            <View style={styles.segmentedControlItem}>
              <Text
                style={
                  selectedIndex === QRTabSwitcherScreens.Scanner
                    ? styles.selectedText
                    : styles.text
                }
              >
                {strings(`qr_tab_switcher.scanner_tab`)}
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPress={() => setSelectedIndex(QRTabSwitcherScreens.Receive)}
          >
            <View style={styles.segmentedControlItem}>
              <Text
                style={
                  selectedIndex === QRTabSwitcherScreens.Receive
                    ? styles.selectedText
                    : styles.text
                }
              >
                {strings(`qr_tab_switcher.receive_tab`)}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  );
};

export default QRTabSwitcher;
