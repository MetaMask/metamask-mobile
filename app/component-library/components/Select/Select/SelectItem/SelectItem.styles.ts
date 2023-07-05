// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../util/theme/models';

// Internal dependencies.
import { SelectItemStyleSheetVars } from './SelectItem.types';

/**
 * Style sheet function for SelectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SelectItemStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDisabled } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        position: 'relative',
        opacity: isDisabled ? 0.5 : 1,
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
  });
};

export default styleSheet;
