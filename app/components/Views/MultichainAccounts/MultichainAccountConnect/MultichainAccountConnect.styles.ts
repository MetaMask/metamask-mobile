// Third party dependencies.
import { StyleSheet, Platform, StatusBar } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for MultichainAccountConnect screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    // We use absolute positioning with opacity instead of display: 'none' or conditional rendering
    // to keep all screens mounted while preventing visual flickering during transitions.
    screenVisible: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    screenHidden: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      opacity: 0,
    },
  });
};

export default styleSheet;
