// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { fontStyles } from '../../../styles/common';

/**
 * Style sheet function for AvatarFavicon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    base: {
      flex: 1,
    },
    rowWrapper: {
      padding: 20,
    },
    tokens: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
    Icon: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 10,
    },
    assetIcon: {
      width: 40,
      height: 40,
    },
    normalText: {
      ...fontStyles.normal,
    },
  });

export default styleSheet;
