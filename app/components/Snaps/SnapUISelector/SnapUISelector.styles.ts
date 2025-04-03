import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';
import { colors as importedColors } from '../../../styles/common';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    modal: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      minHeight: 300,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      overflow: 'hidden',
      maxHeight: '80%',
    },
    content: {
      paddingLeft: 16,
      paddingRight: 16,
    },
    button: {
      backgroundColor: colors.background.default,
      height: 'auto',
      minHeight: 48,
      maxHeight: 58,
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 16,
      paddingLeft: 16,
    },
    modalButton: {
      backgroundColor: importedColors.transparent,
      height: 'auto',
      minHeight: 48,
      maxHeight: 58,
      borderRadius: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 16,
      paddingLeft: 16,
    },
    helpText: {
      marginBottom: 4,
    },
  });
};

export default styleSheet;
