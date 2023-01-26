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
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';

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
  });

// Ledger Logo
const ledgerLogoLightImgPath = 'images/ledger-light.png';
const ledgerLogoLight = require(ledgerLogoLightImgPath);

const ledgerLogoDarkImgPath = 'images/ledger-dark.png';
const ledgerLogoDark = require(ledgerLogoDarkImgPath);

// QR Hardware Logo
const qrHardwareLogoLightImgPath = 'images/qrhardware-light.png';
const qrHardwareLogoLight = require(qrHardwareLogoLightImgPath);

const qrHardwareLogoDarkImgPath = 'images/qrhardware-dark.png';
const qrHardwareLogoDark = require(qrHardwareLogoDarkImgPath);

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyle(colors);
  const { KeyringController } = Engine.context as any;

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
    navigation.navigate(Routes.HW.CONNECT_QR_DEVICE);
  };

  const navigateToConnectLedger = async () => {
    const ledgerKeyring = await KeyringController.getLedgerKeyring();
    const accounts = await ledgerKeyring.getAccounts();

    if (accounts.length === 0) {
      navigation.navigate(Routes.HW.CONNECT_LEDGER);
    } else {
      navigation.navigate(Routes.HW.LEDGER_ACCOUNT, {
        screen: Routes.HW.LEDGER_ACCOUNT,
        params: {
          accounts,
        },
      });
    }
  };

  const renderHardwareButton = (image: any, onPress: any) => (
    <TouchableOpacity onPress={onPress} style={styles.hardwareButton}>
      <Image style={styles.image} source={image} resizeMode={'contain'} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          {strings('connect_hardware.select_hardware')}
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        {renderHardwareButton(
          useAssetFromTheme(ledgerLogoLight, ledgerLogoDark),
          navigateToConnectLedger,
        )}
        {renderHardwareButton(
          useAssetFromTheme(qrHardwareLogoLight, qrHardwareLogoDark),
          navigateToConnectQRWallet,
        )}
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
