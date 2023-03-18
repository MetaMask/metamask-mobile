// Third party dependencies.
import { StyleSheet } from 'react-native';

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
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      height: Device.isAndroid() ? 62 : 48,
      paddingHorizontal: 16,
      marginBottom: bottomInset,
      borderTopWidth: 0.5,
      borderColor: colors.border.muted,
      paddingTop: Device.isAndroid() ? 0 : 20,
    },
    iconContainer: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      marginBottom: 8,
      backgroundColor: colors.primary.default,
    },
  });
};

export default styleSheet;
