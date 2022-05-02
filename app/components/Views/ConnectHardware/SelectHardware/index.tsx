/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React, { useEffect } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';

const createStyle = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      marginHorizontal: '5%',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonsContainer: {
      flex: 7,
      width: '100%',
      alignItems: 'center',
    },
    text: {
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    image: {
      width: 150,
      height: 75,
    },
    hardwareButton: {
      height: 125,
      width: 200,
      margin: 10,
      borderWidth: 1,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border.default,
      backgroundColor: colors.background.alternative,
    },
    button: {
      width: '100%',
    },
    // eslint-disable-next-line react-native/no-color-literals
    debugBorder: {
      borderColor: '#FF3D00',
      borderWidth: 1,
    },
  });

const ledgerLogoImgPath = 'images/ledger-logo.png';
const ledgerLogo = require(ledgerLogoImgPath);

// const qrHardwareLogoImgPath = 'images/';
// const qrHardwareLogo = require(qrHardwareLogoImgPath);

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyle(colors);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('connect_hardware.title_select_hardware'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const navigateToConnectQRWallet = () => {
    navigation.navigate('ConnectQRHardwareFlow');
  };

  const navigateToConnectLedger = () => {
    // eslint-disable-next-line no-console
    console.log('navigateToConnectLedger');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          {strings('connect_hardware.select_hardware')}
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={navigateToConnectLedger}
          style={styles.hardwareButton}
        >
          <Image
            style={styles.image}
            source={ledgerLogo}
            resizeMode={'contain'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={navigateToConnectQRWallet}
          style={styles.hardwareButton}
        >
          <Text>QR-based</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
