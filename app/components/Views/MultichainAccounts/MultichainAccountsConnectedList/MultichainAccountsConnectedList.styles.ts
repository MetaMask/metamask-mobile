// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT } from '../../../UI/PermissionsSummary/PermissionSummary.constants';

interface MultichainAccountsConnectedListStyleSheetVars {
  itemHeight: number;
  numOfAccounts: number;
}

/**
 * Style sheet function for MultichainAccountsConnectedList screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: MultichainAccountsConnectedListStyleSheetVars;
}) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    // Account List Item
    container: {
      flex: 1,
    },
    accountListItem: {
      borderWidth: 0,
      height: ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
      justifyContent: 'center',
    },
    accountsConnectedContainer: {
      backgroundColor: colors.background.default,
      marginTop: 8,
      flex: 1,
    },
    // Balances Container
    balancesContainer: {
      alignItems: 'flex-end',
      flexDirection: 'column',
    },
    balanceLabel: {
      textAlign: 'right',
    },
    // Edit Accounts
    editAccountsContainer: {
      marginTop: 16,
      marginLeft: 16,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 8,
    },
    editAccountIcon: {
      borderRadius: 8,
      backgroundColor: colors.info.muted,
    },
  });
};

export default styleSheet;
