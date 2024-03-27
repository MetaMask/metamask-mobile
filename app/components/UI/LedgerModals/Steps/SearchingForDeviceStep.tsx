import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSystemVersion } from 'react-native-device-info';
import { strings } from '../../../../../locales/i18n';
import { LEDGER_SUPPORT_LINK } from '../../../../constants/urls';
import Device from '../../../../util/device';
import { useAssetFromTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';

import ledgerConnectDarkImage from '../../../../images/ledger-connect-dark.png';
import ledgerConnectLightImage from '../../../../images/ledger-connect-light.png';
import { SEARCHING_FOR_DEVICE_STEP } from './Steps.constants';

const createStyles = () =>
  StyleSheet.create({
    modalTitle: {
      marginTop: 30,
    },
    titleText: {
      fontSize: 22,
    },
    ledgerImageStyle: {
      height: 54,
      overflow: 'visible',
    },
    lookingForDeviceTitle: {
      flexDirection: 'row',
      marginTop: 30,
      alignItems: 'center',
      marginHorizontal: 'auto',
    },
    activityIndicator: {
      marginLeft: 20,
    },
    ledgerInstructionText: {
      paddingLeft: 7,
    },
    instructionsWrapper: {
      marginTop: 30,
    },
    howToInstallEthAppText: {
      marginTop: 40,
      flex: 1,
      flexWrap: 'wrap',
      marginLeft: 20,
      marginRight: 20,
    },
    lookingForDeviceContainer: {
      flex: 1,
      alignItems: 'center',
    },
  });

const SearchingForDeviceStep = () => {
  const styles = useMemo(() => createStyles(), []);
  const navigation = useNavigation();

  const deviceOSVersion = Number(getSystemVersion()) || 0;

  const ledgerImage = useAssetFromTheme(
    ledgerConnectLightImage,
    ledgerConnectDarkImage,
  );

  const handleOpenInstallEthAppInstructions = () => {
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  };

  const permissionText = useMemo(() => {
    if (deviceOSVersion >= 12) {
      return strings('ledger.ledger_reminder_message_step_four_Androidv12plus');
    }
    return strings('ledger.ledger_reminder_message_step_four');
  }, [deviceOSVersion]);

  return (
    <View
      style={styles.lookingForDeviceContainer}
      testID={SEARCHING_FOR_DEVICE_STEP}
    >
      <Image
        source={ledgerImage}
        style={styles.ledgerImageStyle}
        resizeMode="contain"
      />
      <View style={styles.lookingForDeviceTitle}>
        <Text bold big style={styles.titleText}>
          {strings('ledger.looking_for_device')}
        </Text>
        <View style={styles.activityIndicator}>
          <ActivityIndicator />
        </View>
      </View>
      <View style={styles.instructionsWrapper}>
        <Text>{strings('ledger.ledger_reminder_message')}</Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_one')}
        </Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_two')}
        </Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_three')}
        </Text>
        {Device.isAndroid() && (
          <Text style={styles.ledgerInstructionText}>{permissionText}</Text>
        )}
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_five')}
        </Text>
      </View>
      <TouchableOpacity onPress={handleOpenInstallEthAppInstructions}>
        <Text style={styles.howToInstallEthAppText} bold link numerOfLines={2}>
          {strings('ledger.how_to_install_eth_app')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(SearchingForDeviceStep);
