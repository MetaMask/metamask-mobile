import { StyleSheet } from 'react-native';

/**
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    emptyView: {
      alignItems: 'center',
      height: '100%',
      justifyContent: 'center',
    },
    wrapper: {},
  });

export default styleSheet;
