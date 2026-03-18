import { StyleSheet, TextStyle } from 'react-native';
import { type EdgeInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: Colors, insets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      flex: 1,
      backgroundColor: colors.background.default,
      alignItems: 'center',
    },
    connectLedgerWrapper: {
      marginLeft: Device.getDeviceWidth() * 0.07,
      marginRight: Device.getDeviceWidth() * 0.07,
    },
    header: {
      marginTop: insets.top,
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
    },
    navbarRightButton: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      height: 48,
      width: 48,
      flex: 1,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
    ledgerImage: {
      width: 68,
      height: 68,
    },
    coverImage: {
      resizeMode: 'contain',
      width: Device.getDeviceWidth() * 0.6,
      height: 64,
      overflow: 'visible',
    },
    connectLedgerText: {
      ...(fontStyles.normal as TextStyle),
      fontSize: 24,
    },
    bodyContainer: {
      flex: 1,
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    bodyContainerWhithErrorMessage: {
      flex: 1,
      marginTop: Device.getDeviceHeight() * 0.01,
    },
    textContainer: {
      marginTop: Device.getDeviceHeight() * 0.05,
    },

    instructionsText: {
      marginTop: Device.getDeviceHeight() * 0.02,
    },
    imageContainer: {
      alignItems: 'center',
      marginTop: Device.getDeviceHeight() * 0.08,
    },
    buttonContainer: {
      marginBottom: insets.bottom + 20,
    },
    lookingForDeviceContainer: {
      flexDirection: 'row',
    },
    lookingForDeviceText: {
      fontSize: 18,
    },
    activityIndicatorStyle: {
      marginLeft: 10,
    },
    ledgerInstructionText: {
      paddingLeft: 7,
    },
    howToInstallEthAppText: {
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    openEthAppMessage: {
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    loader: {
      color: colors.background.default,
    },
  });

export default createStyles;
