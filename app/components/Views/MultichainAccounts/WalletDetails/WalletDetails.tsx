import React from 'react';
import { useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { RootParamList } from '../../../../util/navigation/types';

type WalletDetailsRouteProp = RouteProp<
  RootParamList,
  'MultichainWalletDetails'
>;

export const WalletDetails = () => {
  const route = useRoute<WalletDetailsRouteProp>();
  const { walletId } = route.params ?? {};
  const selectWallet = useSelector(selectWalletById);
  const wallet = walletId ? selectWallet?.(walletId) : undefined;

  if (!wallet) {
    return null;
  }

  return <BaseWalletDetails wallet={wallet} />;
};
