import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    content: {
      padding: 24,
    },
    iconContainer: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    countryName: {
      marginLeft: 8,
    },
    footer: {
      padding: 24,
      paddingTop: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
  });

export default styleSheet;
