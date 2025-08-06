// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import CaipAccountSelectorList from '../../../UI/CaipAccountSelectorList';
import { strings } from '../../../../../locales/i18n';
import { AccountConnectScreens } from '../AccountConnect.types';

// Internal dependencies.
import { AccountConnectSingleSelectorProps } from './AccountConnectSingleSelector.types';
import styles from './AccountConnectSingleSelector.styles';
import { USER_INTENT } from '../../../../constants/permissions';
import { CaipAccountId } from '@metamask/utils';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts';
import { AccountGroupId } from '@metamask/account-api';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import MultichainAccountSelectorList from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupObject } from '@metamask/account-tree-controller';

interface MultichainAccountConnectSingleSelectorProps {
  accountsGroups: AccountGroupWithInternalAccounts[];
  selectedAccountGroupIds: AccountGroupId[];
  isLoading: boolean;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAccountGroupIds: (accountGroupIds: AccountGroupId[]) => void;
  onUserAction: (intent: USER_INTENT) => void;
}

const MultichainAccountConnectSingleSelector = ({
  selectedAccountGroupIds,
  isLoading,
  onSetScreen,
  onSetSelectedAccountGroupIds,
  onUserAction,
}: MultichainAccountConnectSingleSelectorProps) => {
  const onBack = useCallback(
    () => onSetScreen(AccountConnectScreens.SingleConnect),
    [onSetScreen],
  );

  const onSelectAccountGroupId = useCallback(
    (accountGroup: AccountGroupObject) => {
      console.log('single selector onSelectAccountGroupId', accountGroup);
      onSetScreen(AccountConnectScreens.SingleConnect);
      onSetSelectedAccountGroupIds([accountGroup.id]);
    },
    [onSetScreen, onSetSelectedAccountGroupIds],
  );

  const renderSheetActions = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.create_new_account'),
              onPress: () => onUserAction(USER_INTENT.Create),
              isLoading,
            },
            {
              label: strings('accounts.import_account'),
              onPress: () => onUserAction(USER_INTENT.Import),
              disabled: isLoading,
            },
            {
              label: strings('accounts.connect_hardware'),
              onPress: () => onUserAction(USER_INTENT.ConnectHW),
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [isLoading, onUserAction],
  );

  return (
    <>
      <SheetHeader onBack={onBack} title={strings('accounts.accounts_title')} />
      <MultichainAccountSelectorList
        onSelectAccount={onSelectAccountGroupId}
        selectedAccountGroupsIds={selectedAccountGroupIds}
        testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
      />
      {renderSheetActions()}
    </>
  );
};

export default MultichainAccountConnectSingleSelector;
