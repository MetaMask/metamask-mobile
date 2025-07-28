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
      marginTop: 180,
    },
    wrapper: {
      flex: 1,
    },
  });

export default styleSheet;
