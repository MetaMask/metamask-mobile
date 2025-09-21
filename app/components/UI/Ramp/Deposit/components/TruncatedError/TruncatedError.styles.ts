import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      marginBottom: 8,
      width: '100%',
    },
    textContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    errorText: {
      flex: 1,
    },
    seeMoreText: {
      textDecorationLine: 'underline',
      marginLeft: 4,
    },
  });

export default styleSheet;
