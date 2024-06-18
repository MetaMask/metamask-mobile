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
        position: 'relative',
        opacity: isDisabled ? 0.5 : 1,
        padding: 16,
        backgroundColor: colors.background.default,
        width: '95%',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    underlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      backgroundColor: colors.primary.muted,
    },
    underlayBar: {
      marginVertical: 4,
      marginLeft: 4,
      width: 4,
      borderRadius: 2,
      backgroundColor: colors.primary.default,
    },
    listItem: {
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    },
    container: {
      backgroundColor: isSelected
        ? colors.primary.muted
        : colors.background.default,
      paddingRight: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
