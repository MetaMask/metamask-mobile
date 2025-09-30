import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    searchContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    list: {
      flex: 1,
    },
    region: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      paddingRight: 16,
    },
    emptyList: {
      padding: 16,
      alignItems: 'center',
    },
  });

export default createStyles;
