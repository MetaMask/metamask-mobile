// Third party dependencies.
import { StyleProp, StyleSheet as RNStyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import Device from '../../../../util/device';

// Internal dependencies.
import { TabBarStyleSheetVars } from './TabBar.types';
/**
 * Style sheet function for TabBar component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: TabBarStyleSheetVars; theme: Theme }) => {
  const {
    vars: { bottomInset },
    theme: { colors },
  } = params;

  const shadowStyle: StyleProp<ViewStyle> = Device.isAndroid()
    ? {}
    : {
        shadowColor: colors.overlay.default,
        shadowOpacity: 1,
        shadowOffset: { height: 4, width: 0 },
        shadowRadius: 8,
      };

  return RNStyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: bottomInset,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      ...shadowStyle,
    },
  });
};

export default styleSheet;
