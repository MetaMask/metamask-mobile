import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletId } from '@metamask/account-api';

interface WalletDetailsRouteParams {
  walletId: AccountWalletId;
}

export const WalletDetails = () => {
  const route =
    useRoute<RouteProp<{ params: WalletDetailsRouteParams }, 'params'>>();
  const { walletId } = route.params;
  const selectWallet = useSelector(selectWalletById);
  const wallet = selectWallet?.(walletId);

  if (!wallet) {
    return null;
  }

  return <BaseWalletDetails wallet={wallet} />;
};
