import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    left: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    textContainer: {
      position: 'absolute',
      left: 48,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    right: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingLeft: 16,
    },
    networkAvatar: {
      height: 32,
      width: 32,
      flexShrink: 0,
    },
  });

export default styleSheet;
