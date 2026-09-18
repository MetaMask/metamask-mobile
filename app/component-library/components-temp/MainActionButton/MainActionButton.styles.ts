// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';
import { colorWithOpacity } from '../../../util/colors';
import {
  CTA_BUTTON_GLASS_RADIUS,
  TRADE_TRAY_GLASS_BORDER_OPACITY,
  TRADE_TRAY_GLASS_FILL_OPACITY,
} from '../../components/Navigation/TabBarFloating/TabBarFloating.constants';

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
  const { style, isDisabled, isGlass } = vars;

  let backgroundColor = theme.colors.background.muted;

  if (isDisabled) {
    backgroundColor = theme.colors.background.muted;
  }

  return StyleSheet.create({
    base: Object.assign(
      isGlass
        ? // The glass is a native layer that clips to its own corners, so the
          // hairline sits on the Pressable around it rather than on the glass.
          ({
            borderRadius: CTA_BUTTON_GLASS_RADIUS,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colorWithOpacity(
              theme.colors.border.muted,
              TRADE_TRAY_GLASS_BORDER_OPACITY,
            ),
            opacity: isDisabled ? 0.5 : 1,
          } as const)
        : ({
            backgroundColor,
            borderRadius: 12,
            paddingHorizontal: 4,
            paddingVertical: 12,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: isDisabled ? 0.5 : 1,
          } as const),
      style,
    ),
    pressed: {
      backgroundColor: theme.colors.background.mutedPressed,
    },
    glass: {
      borderRadius: CTA_BUTTON_GLASS_RADIUS,
      overflow: 'hidden',
      paddingHorizontal: 4,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    glassFill: {
      backgroundColor: theme.colors.background.muted,
      opacity: TRADE_TRAY_GLASS_FILL_OPACITY,
    },
    glassFillPressed: {
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
