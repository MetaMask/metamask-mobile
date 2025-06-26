import React from 'react';
import { useSelector } from 'react-redux';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../multichain-accounts/selectors/accountTreeController';

interface WalletDetailsProps {
  route: {
    params: {
      walletId: string;
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
