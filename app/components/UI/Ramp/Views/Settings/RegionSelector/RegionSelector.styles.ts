import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    descriptionText: {
      marginBottom: 16,
      textAlign: 'center',
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
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
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
      paddingLeft: 40,
    },
    nestedStateRegion: {
      paddingLeft: 0,
    },
  });

export const styles = StyleSheet.create({
  headerLeft: {
    marginHorizontal: 16,
  },
});

export default createStyles;
