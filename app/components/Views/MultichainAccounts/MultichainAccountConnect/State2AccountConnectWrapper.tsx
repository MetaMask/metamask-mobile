import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import AccountConnect from '../../AccountConnect/AccountConnect';
import MultichainAccountConnect from './MultichainAccountConnect';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import type { RootParamList } from '../../../../util/navigation/types';
import type { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';

type AccountConnectRouteProp = RouteProp<RootParamList, 'AccountConnect'>;

export const State2AccountConnectWrapper = () => {
  const route = useRoute<AccountConnectRouteProp>();
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Cast route to match expected prop types since we know params exist when this screen is navigated to
  const props = { route } as AccountConnectProps;

  return isMultichainAccountsState2Enabled ? (
    <MultichainAccountConnect {...props} />
  ) : (
    <AccountConnect {...props} />
  );
};
