import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    buttonsContainer: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.section,
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
    },
    earnings: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
  });

export default styleSheet;
