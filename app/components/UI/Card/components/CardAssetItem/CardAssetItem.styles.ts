import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
    assetName: {
      flexDirection: 'row',
    },
    allowanceStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignContent: 'center',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    badge: {
      marginTop: 12,
    },
  });

export default styleSheet;
