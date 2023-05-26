// Third party dependencies.
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import Device from '../../../../../util/device';

const breakPoint = Device.getDeviceHeight() < 700;

/**
 * Style sheet function for EthSignFriction component.
 *
 * @returns StyleSheet object.
 */

export default (colors: any) =>
  StyleSheet.create({
    frictionContainer: {
      flexDirection: 'column',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      width: '100%',
      alignSelf: 'center',
    },
    warningIcon: {
      alignSelf: 'center',
      color: colors.error.default,
      marginTop: 2,
      marginEnd: 3,
      marginBottom: 4,
      marginStart: 3,
    },
    heading: {
      marginHorizontal: 6,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 20,
      textAlign: 'center',
      lineHeight: breakPoint ? 24 : 26,
    },
    red: {
      marginHorizontal: 24,
      color: colors.error.default,
    },
    warning: {
      ...fontStyles.normal,
      fontSize: 14,
      lineHeight: breakPoint ? 18 : 22,
      color: colors.text.default,
      marginTop: 24,
      marginBottom: 16,
      backgroundColor: colors.error.muted,
      borderRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: colors.error.default,
      display: 'flex',
      flexDirection: 'row',
      padding: 8,
    },
    warningText: {
      flex: 1,
    },
    bold: {
      ...fontStyles.bold,
    },
    understandCheckbox: {
      marginEnd: 8,
    },
    understandCheckText: {
      marginEnd: 16,
    },
    understandCheckboxView: {
      margin: 16,
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      display: 'flex',
      fontSize: 14,
    },
    textConfirmField: {
      fontSize: 14,
      textAlign: 'center',
    },
    textConfirmWarningText: {
      fontSize: 12,
    },
    buttonsContainer: {
      flexDirection: 'row',
      display: 'flex',
    },
    buttonStart: {
      flex: 1,
      marginEnd: 8,
    },
    buttonEnd: {
      flex: 1,
      marginStart: 8,
    },
    areYouSure: {
      width: '100%',
      padding: breakPoint ? 16 : 24,
      justifyContent: 'center',
      alignSelf: 'center',
    },
  });
