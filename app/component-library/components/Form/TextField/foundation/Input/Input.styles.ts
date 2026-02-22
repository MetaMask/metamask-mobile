// Third party dependencies.
import { StyleSheet, TextStyle, Platform } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';
import { colors } from '../../../../../../styles/common';
import { getFontFamily } from '../../../../Texts/Text/';

// Internal dependencies
import { InputStyleSheetVars } from './Input.types';

/**
 * Style sheet function for Input component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: InputStyleSheetVars }) => {
  const { theme, vars } = params;
  const { style, textVariant, isDisabled, isStateStylesDisabled, isFocused } =
    vars;

  const stateObj = isStateStylesDisabled
    ? {
        opacity: 1,
      }
    : {
        opacity: isDisabled ? 0.5 : 1,
        borderColor: isFocused
          ? theme.colors.primary.default
          : colors.transparent,
      };

  return StyleSheet.create({
    base: Object.assign(
      {
        color: theme.colors.text.default,
        borderWidth: 1,
        borderColor: colors.transparent,
        backgroundColor: theme.colors.background.default,
        height: 24,
        ...stateObj,
        // Fix for placeholder text shifting with custom Geist fonts
        // Use minimal padding that works cross-platform with preloaded fonts
        paddingVertical: Platform.OS === 'ios' ? 2 : 1,
        fontFamily: getFontFamily(textVariant),
        fontWeight: theme.typography[textVariant].fontWeight,
        fontSize: theme.typography[textVariant].fontSize,
        letterSpacing: theme.typography[textVariant].letterSpacing,
        // iOS-specific fix for custom font baseline alignment
        ...(Platform.OS === 'ios' && {
          textAlignVertical: 'center',
        }),
      },
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
