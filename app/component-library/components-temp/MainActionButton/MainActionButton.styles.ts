// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { MainActionButtonStyleSheetVars } from './MainActionButton.types';

/**
 * Style sheet function for MainActionButton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MainActionButtonStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, isDisabled } = vars;

  let backgroundColor = theme.colors.background.muted;

  if (isDisabled) {
    backgroundColor = theme.colors.background.muted;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
        borderRadius: 12,
        paddingHorizontal: 4,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: isDisabled ? 0.5 : 1,
      } as const,
      style,
    ),
    pressed: {
      backgroundColor: theme.colors.background.mutedPressed,
    },
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      textAlign: 'center',
      marginTop: 2,
      flexShrink: 0,
    },
  });
};

export default styleSheet;
