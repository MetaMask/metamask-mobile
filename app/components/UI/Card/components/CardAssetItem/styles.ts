import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
    assetName: {
      flexDirection: 'row',
    },
    percentageChange: {
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
    bannerStyles: {
      marginVertical: 8,
    },
    buttonsContainer: {
      paddingTop: 8,
    },
    badge: {
      marginTop: 8,
    },
  });

export default styleSheet;
