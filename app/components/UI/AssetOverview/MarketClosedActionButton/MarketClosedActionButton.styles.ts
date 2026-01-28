// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { MarketClosedActionButtonStyleSheetVars } from './MarketClosedActionButton.types';

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
  vars: MarketClosedActionButtonStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style } = vars;

  const backgroundColor = theme.colors.background.muted;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
        marginHorizontal: 16,
        borderRadius: 12,
      } as const,
      style,
    ),
    pressed: {
      backgroundColor: theme.colors.background.mutedPressed,
    },
    container: {
      flexDirection: 'row',
      height: 60,
      alignItems: 'center',
    },
    label: {
      marginLeft: 8,
      flexShrink: 0,
      minWidth: 0,
    },
    icon: {
      marginRight: 16,
      marginLeft: 'auto',
    },
    clockIcon: {
      marginLeft: 16,
    },
  });
};

export default styleSheet;
