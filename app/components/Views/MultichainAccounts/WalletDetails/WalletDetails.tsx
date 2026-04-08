import React from 'react';
import { useSelector } from 'react-redux';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletId } from '@metamask/account-api';

interface WalletDetailsProps {
  route: {
    params: {
      walletId: AccountWalletId;
    };
  };
}

export const WalletDetails = (props: WalletDetailsProps) => {
  const { walletId } = props.route.params;
  const selectWallet = useSelector(selectWalletById);
  const wallet = selectWallet?.(walletId);

  if (!wallet) {
    return null;
  }

  return <BaseWalletDetails wallet={wallet} />;
};
