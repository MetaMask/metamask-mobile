import { StyleSheet } from 'react-native';
/**
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    detailsWrapper: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    separatorWrapper: {
      paddingHorizontal: 16,
    },
  });

export default styleSheet;
