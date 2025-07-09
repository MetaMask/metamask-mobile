// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { ListItemMultiSelectWithMenuButtonStyleSheetVars } from './ListItemMultiSelectWithMenuButton.types';

/**
 * Style sheet function for ListItemMultiSelectWithMenuButton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ListItemMultiSelectWithMenuButtonStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDisabled } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        flex: 1,
        position: 'relative',
        opacity: isDisabled ? 0.5 : 1,
        padding: 16,
        zIndex: 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    containerColumn: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      zIndex: 2,
    },
    container: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
    },
    buttonIcon: {
      paddingRight: 20,
    },
  });
};

export default styleSheet;
