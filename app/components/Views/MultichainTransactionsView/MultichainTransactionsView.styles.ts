import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    listContentContainer: {
      paddingBottom: 80,
    },
    emptyContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });

export default createStyles;
