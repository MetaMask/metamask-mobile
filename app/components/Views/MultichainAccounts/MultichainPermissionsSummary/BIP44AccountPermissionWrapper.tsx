import React from 'react';
import { AccountPermissionsProps } from '../../AccountPermissions/AccountPermissions.types';
import { MultichainAccountPermissions } from '../MultichainAccountPermissions/MultichainAccountPermissions';

export const BIP44AccountPermissionWrapper = React.memo(
  (props: AccountPermissionsProps) => (
    <MultichainAccountPermissions {...props} />
  ),
);
