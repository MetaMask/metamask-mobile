// Third party dependencies.
import { Platform, StyleSheet, TextStyle } from 'react-native';

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
  const {
    style,
    textVariant,
    isDisabled,
    isStateStylesDisabled,
    isFocused,
    value,
    placeholder,
  } = vars;

  // Only apply placeholder-mode styling for controlled empty inputs.
  // For uncontrolled inputs (value is undefined), we avoid forcing lineHeight
  // since style vars cannot track typing state transitions.
  const isPlaceholderVisible = !!placeholder && value === '';

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
        ...stateObj,
        fontFamily: getFontFamily(textVariant),
        fontWeight: theme.typography[textVariant].fontWeight,
        fontSize: theme.typography[textVariant].fontSize,
        letterSpacing: theme.typography[textVariant].letterSpacing,
        // iOS-only workaround: when a placeholder is visible, the native
        // TextInput renders it misaligned (vertically offset) due to how iOS
        // applies lineHeight to placeholder text. Setting lineHeight: 0 resets
        // this. We guard with Platform.OS === 'ios' because lineHeight: 0 on
        // Android collapses the text area, making typed content invisible.
        ...(Platform.OS === 'ios' && isPlaceholderVisible && { lineHeight: 0 }),
      },
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
