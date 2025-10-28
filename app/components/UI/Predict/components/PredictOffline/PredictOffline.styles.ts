import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    errorStateIcon: {
      marginBottom: 16,
    },
    errorStateTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    errorStateDescription: {
      textAlign: 'center',
      marginBottom: 24,
    },
    errorStateButton: {
      alignSelf: 'center',
      width: '100%',
    },
  });

export default styleSheet;
