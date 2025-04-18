import { StyleSheet } from 'react-native';

const styleSheet = () => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      marginBottom: 16,
    },
    left: {
      position: 'absolute',
      left: 0,
    },
    title: {
      textAlign: 'center',
    },
  });

export default styleSheet;
