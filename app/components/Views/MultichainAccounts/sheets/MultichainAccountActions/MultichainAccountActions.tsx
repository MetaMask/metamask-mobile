import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  useNavigation,
  RouteProp,
  ParamListBase,
  useRoute,
} from '@react-navigation/native';

import { AccountGroupObject } from '@metamask/account-tree-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AccountAction from '../../../AccountAction/AccountAction';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import styleSheet from './MultichainAccountActions.styles';

interface MultichainAccountActionsParams {
  accountGroup: AccountGroupObject;
}

const MultichainAccountActions = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { accountGroup } = route.params as MultichainAccountActionsParams;
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();

  // Get the first account from the group for now, this should be changed when Account Details for group is implemented
  const firstAccount = useMemo((): InternalAccount | null => {
    const firstAccountId = accountGroup.accounts[0];
    if (firstAccountId) {
      const { AccountsController } = Engine.context;
      return AccountsController.getAccount(firstAccountId) ?? null;
    }
    return null;
  }, [accountGroup.accounts]);

  const goToAccountDetails = useCallback(() => {
    if (!firstAccount) return;

    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS, {
        account: firstAccount,
      });
    });
  }, [navigate, firstAccount]);

  const goToEditAccountName = useCallback(() => null, []); // TODO: To be implemented

  const goToAddresses = useCallback(() => null, []); // TODO: To be implemented

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <AccountAction
          actionTitle={strings('account_details.title')}
          iconName={IconName.Add}
          onPress={goToAccountDetails}
          testID="multichain-account-actions-account-details"
          style={styles.accountAction}
        />
        <AccountAction
          actionTitle={strings('account_actions.rename_account')}
          iconName={IconName.Edit}
          onPress={goToEditAccountName}
          testID="multichain-account-actions-edit-name"
          style={styles.accountAction}
        />
        <AccountAction
          actionTitle={strings('account_actions.addresses')}
          iconName={IconName.Scan}
          onPress={goToAddresses}
          testID="multichain-account-actions-addresses"
          style={styles.accountAction}
        />
      </View>
    </BottomSheet>
  );
};

export default React.memo(MultichainAccountActions);
