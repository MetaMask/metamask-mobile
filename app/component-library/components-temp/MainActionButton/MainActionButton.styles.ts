// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { MainActionButtonStyleSheetVars } from './MainActionButton.types';

export const BUTTON_RADIUS = 16;

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
  const { style, isDisabled, isGlass } = vars;

  let backgroundColor = theme.colors.background.muted;

  if (isDisabled) {
    backgroundColor = theme.colors.background.muted;
  }

  const contentLayout = {
    paddingHorizontal: 4,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  } as const;

  return StyleSheet.create({
    base: Object.assign(
      {
        ...(isGlass ? {} : { backgroundColor, ...contentLayout }),
        borderRadius: BUTTON_RADIUS,
        opacity: isDisabled && !isGlass ? 0.5 : 1,
      } as const,
      style,
    ),
    glassContent: contentLayout,
    disabledGlassContent: { opacity: 0.5 },
    pressed: {
      backgroundColor: theme.colors.background.mutedPressed,
    },
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    label: {
      textAlign: 'center',
      marginTop: 2,
      width: '100%',
      flexShrink: 0,
      minWidth: 0,
    },
  });
};

export default styleSheet;
