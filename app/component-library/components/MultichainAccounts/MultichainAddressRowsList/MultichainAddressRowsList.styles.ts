import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { MultichainAddressRowsListStyleSheetVars } from './MultichainAddressRowsList.types';

/**
 * Style sheet function for MultichainAddressRowsList component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MultichainAddressRowsListStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    container: Object.assign(
      {
        flex: 1,
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    searchContainer: {
      padding: 16,
      backgroundColor: colors.background.default,
    } as ViewStyle,
    searchTextField: {
      backgroundColor: colors.background.muted,
      borderWidth: 0,
      borderRadius: 16,
      padding: 0,
    } as ViewStyle,
    list: {
      flex: 1,
    } as ViewStyle,
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    } as ViewStyle,
  });
};

export default styleSheet;
