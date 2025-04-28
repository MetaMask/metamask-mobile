import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';
import { colors as importedColors } from '../../../styles/common';
import { BorderRadius } from '../../UI/Box/box.types';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme, vars: { selected?: boolean } }) => {
  const { theme, vars } = params;
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
      backgroundColor: vars.selected ? colors.background.muted : importedColors.transparent,
      height: 'auto',
      minHeight: 48,
      maxHeight: 58,
      borderRadius: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 16,
      paddingLeft: 16,
      position: 'relative',
    },
    selectedPill: {
      position: 'absolute',
      height: '100%',
      marginRight: 12,
      bottom: 8,
      width: 4,
      top: 4,
      left: 4,
      backgroundColor: colors.background.default,
      borderRadius: 9999,
    },
    helpText: {
      marginBottom: 4,
    },
  });
};

export default styleSheet;
