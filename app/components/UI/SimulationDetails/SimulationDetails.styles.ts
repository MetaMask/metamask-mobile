import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { noBalanceChanges?: boolean };
}) => {
  const { theme, vars } = params;
  const { noBalanceChanges = false } = vars;

  return StyleSheet.create({
    container: {
      flexDirection: noBalanceChanges ? 'row' : 'column',
      justifyContent: noBalanceChanges ? 'space-between' : 'flex-start',
      borderRadius: 8,
      padding: 16,
      gap: 16,
      backgroundColor: theme.colors.background.muted,
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
    rowContainer: {
      paddingBottom: 8,
    },
  });
};

export default styleSheet;
