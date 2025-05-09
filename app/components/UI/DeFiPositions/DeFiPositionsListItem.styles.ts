import { StyleSheet } from 'react-native';

/**
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    listItemWrapper: {
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    contentWrapper: {
      marginLeft: 20,
    },
    protocolNameText: {
      marginLeft: 20,
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });

export default styleSheet;
