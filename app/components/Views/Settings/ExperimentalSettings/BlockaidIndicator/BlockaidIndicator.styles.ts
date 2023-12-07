import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    buttonWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 20,
    },
    blockaidWrapper: {
      marginHorizontal: 20,
    },
    iconWrapper: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainer: {
      flex: 1,
      alignSelf: 'flex-end',
    },
    iconStyle: {
      alignSelf: 'center',
      marginTop: 10,
    },
    goBackIcon: {
      alignItems: 'flex-end',
    },

    buttonSize: {
      width: 150,
    },
  });

export default createStyles;
