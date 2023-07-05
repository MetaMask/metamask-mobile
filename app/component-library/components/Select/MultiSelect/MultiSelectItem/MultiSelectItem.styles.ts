// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../util/theme/models';

// Internal dependencies.
import { MultiSelectItemStyleSheetVars } from './MultiSelectItem.types';

/**
 * Style sheet function for MultiSelectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MultiSelectItemStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, gap, isDisabled } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.background.default,
        opacity: isDisabled ? 0.5 : 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    underlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      backgroundColor: colors.primary.muted,
    },
    checkbox: {
      marginRight: 8 - Number(gap),
    },
  });
};

export default styleSheet;
