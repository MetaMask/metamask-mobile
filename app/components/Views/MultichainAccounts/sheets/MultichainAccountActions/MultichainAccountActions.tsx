import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  useNavigation,
  RouteProp,
  ParamListBase,
  useRoute,
} from '@react-navigation/native';

import { AccountGroupObject } from '@metamask/account-tree-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AccountAction from '../../../AccountAction/AccountAction';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import styleSheet from './MultichainAccountActions.styles';
import {
  MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS,
  // MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME,
  MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES,
} from './MultichainAccountActions.testIds';
import { createAddressListNavigationDetails } from '../../AddressList/AddressList';

interface MultichainAccountActionsParams {
  accountGroup: AccountGroupObject;
}

const MultichainAccountActions = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { accountGroup } = route.params as MultichainAccountActionsParams;
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();

  const goToAccountDetails = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS, {
        accountGroup,
      });
    });
  }, [navigate, accountGroup]);

  // const goToEditAccountName = useCallback(() => null, []); // TODO: To be implemented

  const goToAddresses = useCallback(() => {
    navigate(
      ...createAddressListNavigationDetails({
        groupId: accountGroup.id,
        title: `${strings('multichain_accounts.address_list.addresses')} / ${
          accountGroup.metadata.name
        }`,
      }),
    );
  }, [accountGroup.id, accountGroup.metadata.name, navigate]);

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <AccountAction
          actionTitle={strings('account_details.title')}
          iconName={IconName.Add}
          onPress={goToAccountDetails}
          testID={MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS}
          style={styles.accountAction}
        />
        {/* TODO: Uncomment when account group renaming is supported
        <AccountAction
          actionTitle={strings('account_actions.rename_account')}
          iconName={IconName.Edit}
          onPress={goToEditAccountName}
          testID={MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME}
          style={styles.accountAction}
        /> */}
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
