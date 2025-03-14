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
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SegmentedControlStyleSheetVars;
}) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    button: {
      marginRight: 8,
    } as ViewStyle,
    lastButton: {
      marginRight: 0,
    } as ViewStyle,
  });
};

export default styleSheet;
