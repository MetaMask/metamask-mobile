import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'center',
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      width: 24,
      height: 24,
      resizeMode: 'contain',
    },
    contentContainer: {
      marginLeft: 16,
      flex: 1,
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    text: {
      fontSize: 14,
    },
    dot: {
      fontSize: 14,
      marginHorizontal: 4,
    },
    chevronContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default styleSheet;
