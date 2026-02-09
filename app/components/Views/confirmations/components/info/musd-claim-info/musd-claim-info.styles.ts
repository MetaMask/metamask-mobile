import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    titleContainer: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 4,
      textAlign: 'center',
      marginBottom: 8,
    },
    networkContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default styleSheet;
