import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import AccountPermissions from '../../AccountPermissions/AccountPermissions';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import { MultichainAccountPermissions } from '../MultichainAccountPermissions/MultichainAccountPermissions';
import type { RootParamList } from '../../../../util/navigation/types';
import type { AccountPermissionsProps } from '../../AccountPermissions/AccountPermissions.types';

type AccountPermissionsRouteProp = RouteProp<
  RootParamList,
  'AccountPermissions'
>;

export const BIP44AccountPermissionWrapper = React.memo(() => {
  const route = useRoute<AccountPermissionsRouteProp>();
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Cast route to match expected prop types since we know params exist when this screen is navigated to
  const props = { route } as AccountPermissionsProps;

  if (isMultichainAccountsState2Enabled) {
    return <MultichainAccountPermissions {...props} />;
  }
  return <AccountPermissions {...props} />;
});
