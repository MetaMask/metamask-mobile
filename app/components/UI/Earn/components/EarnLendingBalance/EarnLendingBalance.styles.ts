import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { userHasLendingPositions: boolean };
}) => {
  const { vars, theme } = params;
  const { userHasLendingPositions } = vars;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 14,
      gap: 16,
    },
    buttonsContainer: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.background.section,
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
    musdConversionCta: {
      paddingTop: 16,
      paddingBottom: userHasLendingPositions ? 8 : 0,
    },
    EarnEmptyStateCta: {
      paddingTop: 16,
    },
    earnings: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
  });
};

export default styleSheet;
