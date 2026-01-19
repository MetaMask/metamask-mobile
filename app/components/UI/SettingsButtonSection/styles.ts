import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    setting: {
      marginTop: 32,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    modalChildrenContainer: {
      flexDirection: 'column',
      width: '100%',
    },
    modalContentWrapper: {
      width: '100%',
    },
    modalView: {
      alignItems: 'center',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    modalText: {
      textAlign: 'center',
    },
  });

export default createStyles;
