// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { PickerNetworkStyleSheetVars } from './PickerNetwork.types';

/**
 * Style sheet function for PickerNetwork component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars PickerNetwork stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: PickerNetworkStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        height: 32,
        borderRadius: 16,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.alternative,
        alignSelf: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    label: {
      marginHorizontal: 8,
      flexShrink: 1,
    },
  });
};

export default styleSheet;
