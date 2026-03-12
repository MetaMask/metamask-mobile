import { StyleSheet, TextStyle } from 'react-native';
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
      borderRadius: 12,
    },
    button: {
      flex: 1,
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
    tokenAmount: {
      ...theme.typography.sBodySM,
      color: theme.colors.text.alternative,
    } as TextStyle,
    musdConversionCta: {
      paddingTop: 16,
      paddingBottom: userHasLendingPositions ? 8 : 0,
    },
    EarnEmptyStateCta: {
      paddingTop: 16,
    },
    earnings: {
      paddingTop: 16,
    },
  });
};

export default styleSheet;
