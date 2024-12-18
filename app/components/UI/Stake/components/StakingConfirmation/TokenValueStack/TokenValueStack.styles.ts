import { StyleSheet } from 'react-native';

const stylesSheet = () =>
  StyleSheet.create({
    tokenValueStackContainer: {
      alignItems: 'center',
      paddingVertical: 8,
      gap: 8,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    ethLogo: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    balancesContainer: {
      alignItems: 'center',
    },
  });

export default stylesSheet;
