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
      padding: 0,
    },
    tokens: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    Icon: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingHorizontal: 2,
    },
    assetIcon: {
      width: 32,
      height: 32,
    },
    normalText: {
      ...fontStyles.normal,
    },
  });

export default styleSheet;
