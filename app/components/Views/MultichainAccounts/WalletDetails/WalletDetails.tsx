import React from 'react';
import { BaseWalletDetails } from './BaseWalletDetails';
import { AccountWallet } from '@metamask/account-tree-controller';

interface WalletDetailsProps {
  route: {
    params: {
      wallet: AccountWallet;
    };
  };
}

export const WalletDetails = (props: WalletDetailsProps) => {
  const { wallet } = props.route.params;

  return <BaseWalletDetails wallet={wallet} />;
};
