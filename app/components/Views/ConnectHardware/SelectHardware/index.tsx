/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React, { useEffect } from 'react';
import {
  View,
  SafeAreaView,
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
import Routes from '../../../../constants/navigation/Routes';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const createStyle = (colors: any) =>
  StyleSheet.create({
    screen: { justifyContent: 'center' },
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

// QR Hardware Logo
const qrHardwareLogoLightImgPath = 'images/qrhardware-light.png';
const qrHardwareLogoLight = require(qrHardwareLogoLightImgPath);

const qrHardwareLogoDarkImgPath = 'images/qrhardware-dark.png';
const qrHardwareLogoDark = require(qrHardwareLogoDarkImgPath);

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
    navigation.navigate(Routes.HW.CONNECT_QR_DEVICE);
  };

  const renderHardwareButton = (image: any, onPress: any) => (
    <TouchableOpacity onPress={onPress} style={styles.hardwareButton}>
      <Image style={styles.image} source={image} resizeMode={'contain'} />
    </TouchableOpacity>
  );

  const QRButton = () => {
    const qrHardwareLogo = useAssetFromTheme(
      qrHardwareLogoLight,
      qrHardwareLogoDark,
    );
    return renderHardwareButton(qrHardwareLogo, navigateToConnectQRWallet);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodyMD}>
          {strings('connect_hardware.select_hardware')}
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        <QRButton />
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
