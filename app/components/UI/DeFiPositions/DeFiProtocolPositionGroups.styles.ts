import { StyleSheet } from 'react-native';

/**
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    protocolDetailsPositionsWrapper: {
      flexDirection: 'column',
      paddingHorizontal: 16,
      flex: 1,
    },
    wrapper: {
      flex: 1,
    },
  });

export default styleSheet;
