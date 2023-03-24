// Third party dependencies.
import { StyleSheet, ViewStyle, Dimensions } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for BottomSheetContent component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars } = params;
  const { style, isFullscreen } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: isFullscreen ? Dimensions.get('window').width : 'auto',
        height: isFullscreen ? Dimensions.get('window').height : 'auto',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
