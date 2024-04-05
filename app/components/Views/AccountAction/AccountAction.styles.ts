// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { TouchableOpacityStyleSheetVars } from './AccountAction.types';

/**
 * Style sheet function for AccountAction component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TouchableOpacityStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, disabled } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    base: Object.assign(
      {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
      },
      style,
    ) as ViewStyle,
    descriptionLabel: {
      color: disabled ? colors.text.muted : colors.text.default,
    },
    icon: {
      marginHorizontal: 16,
      color: disabled ? colors.text.muted : colors.text.default,
    },
  });
};

export default styleSheet;
