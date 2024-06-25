/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { fontStyles } from '../../../../styles/common';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useMetrics } from '../../../../components/hooks/useMetrics';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const { trackEvent } = useMetrics();
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

  const navigateToConnectLedger = async () => {
    trackEvent(MetaMetricsEvents.CONNECT_LEDGER, {
      device_type: 'Ledger',
    });

    navigation.navigate(Routes.HW.CONNECT_LEDGER);
  };

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderHardwareButton = (image: any, onPress: any) => (
    <TouchableOpacity onPress={onPress} style={styles.hardwareButton}>
      <Image style={styles.image} source={image} resizeMode={'contain'} />
    </TouchableOpacity>
  );

  const LedgerButton = () => {
    const ledgerLogo = useAssetFromTheme(ledgerLogoLight, ledgerLogoDark);
    return renderHardwareButton(ledgerLogo, navigateToConnectLedger);
  };

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
        <LedgerButton />
        <QRButton />
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
