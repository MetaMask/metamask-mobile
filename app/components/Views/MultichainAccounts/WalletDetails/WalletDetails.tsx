import React from 'react';
import { useSelector } from 'react-redux';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletId } from '@metamask/account-api';

export interface WalletDetailsRouteParams {
  walletId: AccountWalletId;
}

type WalletDetailsProps = StackScreenProps<
  RootStackParamList,
  'MultichainWalletDetails'
>;

export const WalletDetails = (props: WalletDetailsProps) => {
  const walletId = props.route.params?.walletId;
  const selectWallet = useSelector(selectWalletById);
  const wallet = walletId ? selectWallet?.(walletId) : undefined;

  if (!wallet) {
    return null;
  }

  return <BaseWalletDetails wallet={wallet} />;
};
