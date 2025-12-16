import { StyleSheet } from 'react-native';
/**
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    detailsWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    separatorWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    protocolPositionDetailsWrapper: {
      flex: 1,
    },
  });

export default styleSheet;
