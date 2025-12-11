import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

/**
 * Generates the style sheet for the SnapUIDateTimePicker component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: {
    selected?: boolean;
    compact?: boolean;
  };
}) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    modal: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      gap: 16,
      paddingLeft: 16,
      paddingRight: 16,
    },
  });
};

export default styleSheet;
