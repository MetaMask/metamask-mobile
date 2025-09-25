import React from 'react';
import AccountPermissions from '../../AccountPermissions/AccountPermissions';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import { AccountPermissionsProps } from '../../AccountPermissions/AccountPermissions.types';
import { MultichainAccountPermissions } from '../MultichainAccountPermissions/MultichainAccountPermissions';

export const BIP44AccountPermissionWrapper = React.memo(
  (props: AccountPermissionsProps) => {
    const isMultichainAccountsState2Enabled = useSelector(
      selectMultichainAccountsState2Enabled,
    );

    if (isMultichainAccountsState2Enabled) {
      return <MultichainAccountPermissions {...props} />;
    }
    return <AccountPermissions {...props} />;
  },
);
