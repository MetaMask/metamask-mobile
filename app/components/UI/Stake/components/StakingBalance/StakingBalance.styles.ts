import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
      alignSelf: 'center',
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
    stakingCta: {
      paddingBottom: 8,
    },
  });

export default styleSheet;
