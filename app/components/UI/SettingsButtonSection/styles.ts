import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    accessory: {
      marginTop: 12,
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
    sheetContent: {
      paddingBottom: 24,
      paddingHorizontal: 16,
    },
    sheetText: {
      lineHeight: 20,
      marginBottom: 16,
    },
    sheetSecondaryAction: {
      marginBottom: 12,
    },
  });

export default createStyles;
