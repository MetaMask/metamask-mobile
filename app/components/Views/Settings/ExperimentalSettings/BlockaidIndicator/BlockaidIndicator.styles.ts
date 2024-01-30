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
      marginBottom: 10,
    },
    iconWrapper: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    successIconContainer: {
      flex: 1,
      marginLeft: 25,
    },
    iconContainer: {
      flex: 1,
      alignSelf: 'flex-end',
    },
    iconStyle: {
      alignSelf: 'center',
    },
    goBackIcon: {
      alignItems: 'flex-end',
    },

    buttonSize: {
      width: 150,
    },

    wideButtonSize: {
      width: '100%',
    },
  });

export default createStyles;
