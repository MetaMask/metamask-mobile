/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../util/theme';
import { useNavigation } from '@react-navigation/native';
import Device from '../../../../util/device';

const ledgerConnectLightImage = require('../../../../images/ledger-connect-light.png');
const ledgerConnectDarkImage = require('../../../../images/ledger-connect-dark.png');

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

  const ledgerImage = useAssetFromTheme(
    ledgerConnectLightImage,
    ledgerConnectDarkImage,
  );

  const handleOpenInstallEthAppInstructions = () => {
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.ledger.com/hc/en-us/articles/360009576554-Ethereum-ETH-?docs=true',
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  };

  return (
    <View style={styles.lookingForDeviceContainer}>
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
          <Text style={styles.ledgerInstructionText}>
            {strings('ledger.ledger_reminder_message_step_four')}
          </Text>
        )}
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
