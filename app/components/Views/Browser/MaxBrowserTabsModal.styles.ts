import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    sheet: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    infoIconWrap: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    dialogDescription: {
      marginBottom: 20,
    },
  });

export default styleSheet;
