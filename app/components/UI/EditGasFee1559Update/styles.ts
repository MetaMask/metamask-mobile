import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      maxHeight: '95%',
      paddingTop: 24,
      paddingBottom: Device.isIphoneX() ? 32 : 24,
    },
    wrapper: {
      paddingHorizontal: 24,
    },
    customGasHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingBottom: 20,
    },
    newGasFeeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      justifyContent: 'center',
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 22,
    },
    headerText: {
      fontSize: 48,
      flex: 1,
      textAlign: 'center',
    },
    headerTitle: {
      flexDirection: 'row',
    },
    saveButton: {
      marginBottom: 20,
    },
    labelTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    labelInfo: {
      color: colors.text.muted,
    },
    advancedOptionsContainer: {
      marginTop: 25,
      marginBottom: 30,
    },
    advancedOptionsInputsContainer: {
      marginTop: 14,
    },
    rangeInputContainer: {
      marginBottom: 20,
    },
    advancedOptionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    advancedOptionsIcon: {
      paddingTop: 1,
      marginLeft: 5,
    },
    learnMoreLabels: {
      marginTop: 9,
    },
    warningTextContainer: {
      lineHeight: 20,
      paddingLeft: 4,
      flex: 1,
    },
    warningText: {
      lineHeight: 20,
      flex: 1,
      color: colors.text.default,
    },
    warningContainer: {
      marginBottom: 20,
    },
    dappEditGasContainer: {
      marginVertical: 20,
    },
    subheader: {
      marginBottom: 6,
    },
    learnMoreModal: {
      maxHeight: Device.getDeviceHeight() * 0.7,
    },
    redInfo: {
      marginLeft: 2,
      color: colors.error.default,
    },
  });

export default createStyles;
