import React from 'react';
import AccountConnect from '../../AccountConnect/AccountConnect';
import { useSelector } from 'react-redux';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';

export const State2AccountConnectWrapper = (props: AccountConnectProps) => {
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  return isMultichainAccountsState2Enabled ? (
    // TODO: replace with MultichainAccountConnect in subsequent PR
    <AccountConnect {...props} />
  ) : (
    <AccountConnect {...props} />
  );
};
