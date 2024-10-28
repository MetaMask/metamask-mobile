import { StyleSheet } from 'react-native';

const stylesSheet = () =>
  StyleSheet.create({
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      paddingTop: 24,
    },
    button: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
    },
  });

export default stylesSheet;
