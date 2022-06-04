import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const HEIGHT = 60;
const WIDTH = 340;
const BORDER_RADIUS = 8;

/**
 * Style sheet function for Link component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    baseToastContainer: {
      width: WIDTH,
      minHeight: HEIGHT,
      borderColor: theme.colors.warning.default,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS,
      marginHorizontal: 10,
      backgroundColor: theme.colors.warning.inverse,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
    },
    baseToastWrapper: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: theme.colors.warning.muted,
      flexDirection: 'row',
    },
    warningToastIconContainer: {
      marginTop: 3,
    },
    warningToastTextContainer: {
      flex: 1,
      marginLeft: 10,
    },
    warningToastTitle: {
      marginBottom: 5,
    },
    warningToastActionsContainer: {
      flexDirection: 'row',
      marginTop: 10,
    },
    warningToastdismissableAction: {
      marginRight: 15,
    },
  });
};

export default styleSheet;
