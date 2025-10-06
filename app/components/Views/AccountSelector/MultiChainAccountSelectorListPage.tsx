import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import Engine from '../../../core/Engine';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './MultiChainAccountSelectorListPage.styles';

export const createMultichainAccountSelectorListPageNavigationDetails =
  createNavigationDetails(
    Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
  );

const MultiChainAccountSelectorListPage = () => {
  // const { trackEvent, createEventBuilder } = useMetrics();
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const { styles } = useStyles(styleSheet, {});

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      // trackEvent(
      //   createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
      //     .addProperties({
      //       source: 'Wallet Tab',
      //       number_of_accounts: accounts?.length,
      //     })
      //     .build(),
      // );
    },
    [],
  );
  return selectedAccountGroup ? (
    <SafeAreaView style={styles.container}>
      <MultichainAccountSelectorList
        onSelectAccount={_onSelectMultichainAccount}
        selectedAccountGroups={[selectedAccountGroup]}
        // testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
        // setKeyboardAvoidingViewEnabled={}
      />
    </SafeAreaView>
  ) : null;
};

export default MultiChainAccountSelectorListPage;
