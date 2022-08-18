// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../util/theme/models';

// Internal dependencies.
import { MultiselectItemStyleSheetVars } from './MultiselectItem.types';

/**
 * Style sheet function for MultiselectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MultiselectItemStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 4,
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    underlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      backgroundColor: colors.primary.muted,
    },
    checkbox: {
      marginRight: 8,
    },
    childrenContainer: {
      flex: 1,
    },
  });
};

export default styleSheet;
