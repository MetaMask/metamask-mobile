import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for BackupAlert component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      position: 'absolute',
      left: 16,
      right: 16,
      borderRadius: 8,
      borderColor: colors.warning.default,
      borderWidth: 1,
    },
    backupAlertWrapper: {
      flex: 1,
      backgroundColor: colors.warning.muted,
      padding: 14,
    },
    backupAlertIconWrapper: {
      marginRight: 10,
    },
    backupAlertIcon: {
      fontSize: 22,
      color: colors.text.default,
    },
    backupAlertTitle: {
      marginBottom: 14,
    },
    backupAlertMessage: {
      color: colors.primary.default,
      marginLeft: 14,
      flex: 1,
      textAlign: 'right',
    },
    touchableView: {
      flexDirection: 'row',
    },
    modalViewInBrowserView: {
      bottom: Device.isIphoneX() ? 180 : 170,
    },
    modalViewNotInBrowserView: {
      bottom: Device.isIphoneX() ? 120 : 110,
    },
    buttonsWrapper: {
      flexDirection: 'row-reverse',
      alignContent: 'flex-end',
      flex: 1,
    },
    dismissButton: {
      flex: 1,
    },
  });
};

export default styleSheet;
