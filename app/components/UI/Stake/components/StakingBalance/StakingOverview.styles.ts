import { StyleSheet, TextStyle } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      borderRadius: 12,
    },
    stakingEarnings: {
      paddingTop: 16,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      paddingLeft: 16,
    },
    ethLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    tokenAmount: {
      ...params.theme.typography.sBodySM,
      color: params.theme.colors.text.alternative,
    } as TextStyle,
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
