import { StyleSheet } from 'react-native';

/**
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    listItemWrapper: {
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    contentWrapper: {
      marginLeft: 20,
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });

export default styleSheet;
