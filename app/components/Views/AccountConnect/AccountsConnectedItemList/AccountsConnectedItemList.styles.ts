// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import {
  ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
  MAX_VISIBLE_ITEMS,
} from '../../../UI/PermissionsSummary/PermissionSummary.constants';

interface AccountConnectSummaryStyleSheetVars {
  itemHeight: number;
}

/**
 * Style sheet function for AccountConnectSingle screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AccountConnectSummaryStyleSheetVars;
}) => {
  const { theme } = params;
  const { colors } = theme;

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
      marginTop: 8,
      backgroundColor: colors.background.default,
      borderRadius: 16,
      overflow: 'hidden',
      marginHorizontal: 8,
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
      alignItems: 'center',
    },
    editAccount: {
      marginTop: 8,
    },
  });
};

export default styleSheet;
