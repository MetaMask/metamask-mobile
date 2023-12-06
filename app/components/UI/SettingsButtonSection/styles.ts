import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';

const createStyles = (colors: any) =>
  StyleSheet.create({
    setting: {
      marginTop: 30,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 20,
    },
    modalText: {
      textAlign: 'center',
    },
  });

export default createStyles;
