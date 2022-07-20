import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from 'app/util/theme/models';
import { NetworkPickerStyleSheetVars } from './NetworkPicker.types';

/**
 * Style sheet function for NetworkPicker component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars NetworkPicker stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: NetworkPickerStyleSheetVars;
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
      } as ViewStyle,
      style,
    ) as ViewStyle,
    label: {
      marginHorizontal: 8,
    },
  });
};

export default styleSheet;
