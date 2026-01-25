// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { ListItemMultiSelectButtonStyleSheetVars } from './ListItemMultiSelectButton.types';

/**
 * Style sheet function for ListItemSelect component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ListItemMultiSelectButtonStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDisabled, isSelected } = vars;
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
    listItem: {
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    },
    containerColumn: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingRight: 0,
      paddingLeft: 0,
      paddingTop: 0,
      paddingBottom: 0,
      zIndex: 2,
    },
    containerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 0,
      marginLeft: 40,
    },
    container: {
      backgroundColor: isSelected
        ? colors.background.muted
        : colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemColumn: {
      display: 'flex',
      marginTop: 0,
      marginBottom: 0,
      color: colors.text.alternative,
    },
    arrowStyle: {
      paddingLeft: 8,
      paddingTop: 32,
    },
    buttonIcon: {
      paddingRight: 8,
    },
  });
};

export default styleSheet;
