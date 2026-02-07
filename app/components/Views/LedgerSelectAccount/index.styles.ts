import { Colors } from '../../../util/theme/models';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
    },
    ledgerIcon: {
      width: 60,
      height: 60,
    },
    header: {
      marginTop: Device.isIphoneX() ? 50 : 20,
      flexDirection: 'row',
      width: '100%',
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    selectorContainer: {
      flex: 1,
      flexDirection: 'column',
    },
    mainTitle: {
      fontSize: 24,
      marginBottom: 10,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    selectorTitle: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.bold,
      marginBottom: 10,
    },
    selectorDescription: {
      fontSize: 10,
      color: colors.text.default,
      ...fontStyles.normal,
      marginBottom: 10,
      width: Device.getDeviceWidth() * 0.85,
    },
    pathSelector: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      height: 45,
      width: Device.getDeviceWidth() * 0.85,
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
    error: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.error.default,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
  });

export default createStyles;
