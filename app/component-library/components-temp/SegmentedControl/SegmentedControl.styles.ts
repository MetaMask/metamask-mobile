// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { SegmentedControlStyleSheetVars } from './SegmentedControl.types';

/**
 * Style sheet function for SegmentedControl component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SegmentedControlStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, isButtonWidthFlexible } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      } as ViewStyle,
      style,
    ) as ViewStyle,

    buttonContainer: {
      // Only use flex: 1 when buttons should have fixed equal widths (not the default)
      ...(isButtonWidthFlexible ? {} : { flex: 1 }),
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    scrollContentContainer: {
      alignItems: 'center',
    } as ViewStyle,
  });
};

export default styleSheet;
