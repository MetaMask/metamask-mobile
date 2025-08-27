// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import {
  ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
  MAX_VISIBLE_ITEMS,
} from '../../../UI/PermissionsSummary/PermissionSummary.constants';

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
  const { numOfAccounts } = params.vars;

  return StyleSheet.create({
    // Account List Item
    container: {
      maxHeight: ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT * MAX_VISIBLE_ITEMS,
    },
    accountListItem: {
      borderWidth: 0,
      height: ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
      justifyContent: 'center',
    },
    accountsConnectedContainer: {
      backgroundColor: colors.background.default,
      marginTop: 8,
      overflow: 'hidden',
      minHeight: ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT * numOfAccounts,
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
      marginTop: 8,
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
