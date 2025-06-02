import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      maxHeight: '80%',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      width: '100%',
      paddingVertical: 16,
      height: 80,
    },
  });
};

export default styleSheet;
