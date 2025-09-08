import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  useNavigation,
  RouteProp,
  ParamListBase,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { AccountGroupObject } from '@metamask/account-tree-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import AccountAction from '../../../AccountAction/AccountAction';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { RootState } from '../../../../../reducers';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import styleSheet from './MultichainAccountActions.styles';
import {
  MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS,
  MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME,
  MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES,
} from './MultichainAccountActions.testIds';
import { createAddressListNavigationDetails } from '../../AddressList/AddressList';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';

export const createAccountGroupDetailsNavigationDetails =
  createNavigationDetails<{
    accountGroup: AccountGroupObject;
  }>(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS);

export const createEditAccountNameNavigationDetails = createNavigationDetails<{
  accountGroup: AccountGroupObject;
}>(Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME);

export const createMultichainAccountDetailActionsModalNavigationDetails =
  createNavigationDetails<{
    screen: string;
    params: { accountGroup: AccountGroupObject };
  }>(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS);

interface MultichainAccountActionsParams {
  accountGroup: AccountGroupObject;
}

const MultichainAccountActions = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { accountGroup: initialAccountGroup } =
    route.params as MultichainAccountActionsParams;
  const { id } = initialAccountGroup;

  const accountGroup =
    useSelector((state: RootState) => selectAccountGroupById(state, id)) ||
    initialAccountGroup;

  const { styles } = useStyles(styleSheet, {});
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { navigate, goBack } = useNavigation();

  const handleOnClose = useCallback(() => {
    // Close the entire modal stack by going back to the parent
    goBack();
  }, [goBack]);

  const goToAccountDetails = useCallback(() => {
    // Close the modal and navigate to account details
    goBack();
    navigate(
      ...createAccountGroupDetailsNavigationDetails({
        accountGroup,
      }),
    );
  }, [navigate, goBack, accountGroup]);

  const goToEditAccountName = useCallback(() => {
    // Navigate to edit account name sheet within the same modal
    navigate(
      ...createEditAccountNameNavigationDetails({
        accountGroup,
      }),
    );
  }, [navigate, accountGroup]);

  const goToAddresses = useCallback(() => {
    // Close the modal and navigate to address list
    goBack();
    navigate(
      ...createAddressListNavigationDetails({
        groupId: accountGroup.id,
        title: `${strings('multichain_accounts.address_list.addresses')} / ${
          accountGroup.metadata.name
        }`,
      }),
    );
  }, [accountGroup.id, accountGroup.metadata.name, navigate, goBack]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleOnClose}>
        {accountGroup?.metadata?.name || 'Account Group'}
      </BottomSheetHeader>
      <View style={styles.container}>
        <AccountAction
          actionTitle={strings('account_details.title')}
          iconName={IconName.Add}
          onPress={goToAccountDetails}
          testID={MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS}
          style={styles.accountAction}
        />
        <AccountAction
          actionTitle={strings('account_actions.rename_account')}
          iconName={IconName.Edit}
          onPress={goToEditAccountName}
          testID={MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME}
          style={styles.accountAction}
        />
        <AccountAction
          actionTitle={strings('account_actions.addresses')}
          iconName={IconName.Scan}
          onPress={goToAddresses}
          testID={MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES}
          style={styles.accountAction}
        />
      </View>
    </BottomSheet>
  );
};

export default React.memo(MultichainAccountActions);
