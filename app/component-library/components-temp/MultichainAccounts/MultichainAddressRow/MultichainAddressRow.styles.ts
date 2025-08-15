import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { MultichainAddressRowStyleSheetVars } from './MultichainAddressRow.types';

/**
 * Style sheet function for MultichainAddressRow component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MultichainAddressRowStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      gap: 16,
      backgroundColor: colors.background.default,
      ...StyleSheet.flatten(style),
    } as ViewStyle,
    content: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
    } as ViewStyle,
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    } as ViewStyle,
  });
};

export default styleSheet;
