import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.section,
    },
    stakingEarnings: {
      paddingHorizontal: 16,
      paddingTop: 16,
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
