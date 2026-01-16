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
import { useAssetFromTheme, useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ledgerConnectDarkImage from '../../../../images/ledger-connect-dark.png';
import ledgerConnectLightImage from '../../../../images/ledger-connect-light.png';
import { SEARCHING_FOR_DEVICE_STEP } from './Steps.constants';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
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
      color: colors.primary.default,
    },
    lookingForDeviceContainer: {
      flex: 1,
      alignItems: 'center',
    },
  });

const SearchingForDeviceStep = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();

  const deviceOSVersion = Number(getSystemVersion()) || 0;

  const ledgerImage = useAssetFromTheme(
    ledgerConnectLightImage,
    ledgerConnectDarkImage,
  );

  const handleOpenInstallEthAppInstructions = () => {
    //@ts-expect-error - Property 'push' does not exist on type 'NavigationProp<RootParamList>'
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
        <Text variant={TextVariant.BodyMDBold} style={styles.titleText}>
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
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.blind_signing_message')}
        </Text>
      </View>
      <TouchableOpacity onPress={handleOpenInstallEthAppInstructions}>
        <Text
          style={styles.howToInstallEthAppText}
          variant={TextVariant.BodyMD}
          numberOfLines={2}
        >
          {strings('ledger.how_to_install_eth_app')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(SearchingForDeviceStep);
