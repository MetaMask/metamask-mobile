import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',

      paddingTop: 14,
      gap: 16,
    },
    button: {
      flex: 1,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 16,
      alignSelf: 'center',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    EarnEmptyStateCta: {
      paddingTop: 8,
      paddingHorizontal: 16,
    },
    earnings: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
  });

export default styleSheet;
