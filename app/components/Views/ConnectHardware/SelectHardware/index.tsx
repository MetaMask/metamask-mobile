/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import HeaderWithTitleLeft from '../../../../component-library/components-temp/HeaderWithTitleLeft';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../../util/theme';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../../constants/keyringTypes';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyle = (colors: any) =>
  StyleSheet.create({
    screen: { justifyContent: 'center' },
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    buttonsContainer: {
      width: '100%',
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
    },
    image: {
      width: 150,
      height: 75,
    },
    hardwareButton: {
      height: 125,
      flex: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.section,
    },
    button: {
      width: '100%',
    },
    subtitle: {
      marginTop: 4,
    },
  });

// Ledger Logo
const ledgerLogoLightImgPath = '../../../../images/ledger-light.png';
const ledgerLogoLight = require(ledgerLogoLightImgPath);

const ledgerLogoDarkImgPath = '../../../../images/ledger-dark.png';
const ledgerLogoDark = require(ledgerLogoDarkImgPath);

// QR Hardware Logo
const qrHardwareLogoLightImgPath = '../../../../images/qrhardware-light.png';
const qrHardwareLogoLight = require(qrHardwareLogoLightImgPath);

const qrHardwareLogoDarkImgPath = '../../../../images/qrhardware-dark.png';
const qrHardwareLogoDark = require(qrHardwareLogoDarkImgPath);

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyle(colors);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const navigateToConnectQRWallet = async () => {
    try {
      const connectedDeviceCount = await getConnectedDevicesCount();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET)
          .addProperties({
            device_type: HardwareDeviceTypes.QR,
            connected_device_count: connectedDeviceCount.toString(),
          })
          .build(),
      );
    } catch (error) {
      // [SelectHardware] Analytics error should not block navigation
      console.error('[SelectHardware] Failed to track analytics:', error);
    }
    navigation.navigate(Routes.HW.CONNECT_QR_DEVICE);
  };

  const navigateToConnectLedger = async () => {
    try {
      const connectedDeviceCount = await getConnectedDevicesCount();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            connected_device_count: connectedDeviceCount.toString(),
          })
          .build(),
      );
    } catch (error) {
      // [SelectHardware] Analytics error should not block navigation
      console.error('[SelectHardware] Failed to track analytics:', error);
    }

    navigation.navigate(Routes.HW.CONNECT_LEDGER);
  };

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderHardwareButton = (image: any, onPress: any, testID?: string) => (
    <TouchableOpacity
      onPress={onPress}
      style={styles.hardwareButton}
      testID={testID}
    >
      <Image style={styles.image} source={image} resizeMode={'contain'} />
    </TouchableOpacity>
  );

  const LedgerButton = () => {
    const ledgerLogo = useAssetFromTheme(ledgerLogoLight, ledgerLogoDark);
    return renderHardwareButton(
      ledgerLogo,
      navigateToConnectLedger,
      'ledger-hardware-button',
    );
  };

  const QRButton = () => {
    const qrHardwareLogo = useAssetFromTheme(
      qrHardwareLogoLight,
      qrHardwareLogoDark,
    );
    return renderHardwareButton(
      qrHardwareLogo,
      navigateToConnectQRWallet,
      'qr-hardware-button',
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithTitleLeft
        onBack={navigation.goBack}
        titleLeftProps={{
          title: strings('connect_hardware.title_select_hardware'),
          bottomAccessory: (
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.subtitle}
            >
              {strings('connect_hardware.select_hardware')}
            </Text>
          ),
        }}
      />
      <View style={styles.buttonsContainer}>
        <LedgerButton />
        <QRButton />
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
