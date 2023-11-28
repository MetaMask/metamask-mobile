/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React, { useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { setShowLedgerBeta } from '../../../../actions/settings';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { getLedgerKeyring } from '../../../../core/Ledger/Ledger';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
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
  const [ledgerTaps, setLedgerTaps] = useState<number>(1);

  const ledgerBetaEnabled = useSelector(
    (state: any) => state.settings.enableLedgerBeta,
  );

  const dispatch = useDispatch();

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

  const showLedgerBetaAlert = () =>
    Alert.alert(
      strings('ledger.ledger_beta_alert'),
      strings('ledger.ledger_beta_alert_description'),
      [
        {
          text: strings('ledger.ledger_beta_cta'),
          onPress: () => dispatch(setShowLedgerBeta(true)),
        },
      ],
    );

  const updateLedgerBetaTaps = () => {
    if (ledgerBetaEnabled) {
      return;
    }

    if (ledgerTaps === 7) {
      showLedgerBetaAlert();
    } else {
      setLedgerTaps(ledgerTaps + 1);
    }
  };

  const navigateToConnectQRWallet = () => {
    navigation.navigate(Routes.HW.CONNECT_QR_DEVICE);
  };

  const navigateToConnectLedger = async () => {
    const ledgerKeyring = await getLedgerKeyring();
    const accounts = await ledgerKeyring.getAccounts();

    AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_LEDGER, {
      device_type: 'Ledger',
    });

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

  const LedgerButton = () => {
    const ledgerLogo = useAssetFromTheme(ledgerLogoLight, ledgerLogoDark);
    return (
      ledgerBetaEnabled &&
      renderHardwareButton(ledgerLogo, navigateToConnectLedger)
    );
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
        <Text variant={TextVariant.BodyMD} onPress={updateLedgerBetaTaps}>
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
