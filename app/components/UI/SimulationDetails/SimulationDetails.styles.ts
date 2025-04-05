import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (
  params: {
    theme: Theme;
    vars: { isTransactionsRedesign: boolean };
  }) => {
  const { theme, vars } = params;
  const { isTransactionsRedesign } = vars;

  return StyleSheet.create({
    container: {
      borderWidth: isTransactionsRedesign ? 0 : 1,
      borderColor: theme.colors.border.default,
      flexDirection: 'column',
      borderRadius: 8,
      padding: 16,
      gap: 16,
      backgroundColor: isTransactionsRedesign ? theme.colors.background.default: undefined,
    },
    errorContentContainer: {
      flexDirection: 'row',
      gap: 4,
    },
    errorIcon: {
      marginTop: 1,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    innerHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    changeListContainer: {
      flexDirection: 'column',
      gap: 16,
    },
  });
};

export default styleSheet;
