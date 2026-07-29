import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    descriptionText: {
      alignSelf: 'stretch',
      marginBottom: 16,
      textAlign: 'left',
      width: '100%',
    },
    list: {
      flex: 1,
    },
    row: {
      minHeight: 56,
    },
    emoji: {
      minWidth: 32,
    },
    emptyList: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    errorText: {
      marginBottom: 8,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
    },
    nestedStateItem: {
      paddingLeft: 48,
    },
  });

export const styles = StyleSheet.create({
  headerLeft: {
    marginHorizontal: 16,
  },
});

export default createStyles;
