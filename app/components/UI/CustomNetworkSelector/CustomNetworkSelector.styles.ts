import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    // custom network styles
    container: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: 100,
    },
    addNetworkButtonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: 14,
    },
  });

export default createStyles;
