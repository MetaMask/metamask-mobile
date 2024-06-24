import { useNavigation } from '@react-navigation/native';
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

export interface QRTabSwitcherParams {
  onScanSuccess: (data: any, content?: string) => void;
  onScanError?: (error: string) => void;
  onStartScan?: (data: any) => Promise<void>;
  origin?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRTabSwitcherParams>(Routes.QR_TAB_SWITCHER);

const QRTabSwitcher = ({
  onScanError,
  onScanSuccess,
  onStartScan,
  origin,
}: QRTabSwitcherParams) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const renderContent = () => {
    if (selectedIndex === 0) {
      return (
        <QRScanner
          onScanError={onScanError}
          onScanSuccess={onScanSuccess}
          onStartScan={onStartScan}
          origin={origin}
        />
      );
    }
    return (
      <ReceiveRequest
        navigation={navigation}
        hideModal={false}
        showReceiveModal
      />
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.overlayContainerColumn}>
        <View style={styles.overlay}>
          {selectedIndex === 1 ? (
            <NavbarTitle title={'Receive'} translate={false} disableNetwork />
          ) : null}
          <TouchableOpacity style={styles.closeIcon} onPress={goBack}>
            <Icon name={'ios-close'} size={30} color={'black'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.segmentedControlContainer}>
        <TouchableOpacity
          style={[
            styles.segmentedControlItem,
            selectedIndex === 0 && styles.segmentedControlItemSelected,
          ]}
          onPress={() => setSelectedIndex(0)}
        >
          <Text style={selectedIndex === 0 ? styles.selectedText : styles.text}>
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
          <Text style={selectedIndex === 1 ? styles.selectedText : styles.text}>
            My QR
          </Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
    </View>
  );
};

export default QRTabSwitcher;
