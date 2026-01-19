// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { ListItemSelectStyleSheetVars } from './ListItemSelect.types';

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
  vars: ListItemSelectStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDisabled } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        position: 'relative',
        opacity: isDisabled ? 0.5 : 1,
        borderRadius: 4,
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    underlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      backgroundColor: colors.background.muted,
    },
    listItem: {
      padding: 16,
    },
  });
};

export default styleSheet;
