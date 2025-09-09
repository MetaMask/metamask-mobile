import React from 'react';
import { useSelector } from 'react-redux';
import { BaseWalletDetails } from './BaseWalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../util/navigation/types';

type WalletDetailsProps = StackScreenProps<
  RootParamList,
  'MultichainWalletDetails'
>;

export const WalletDetails = (props: WalletDetailsProps) => {
  const { walletId } = props.route.params;
  const selectWallet = useSelector(selectWalletById);
  const wallet = selectWallet?.(walletId);

  if (!wallet) {
    return null;
  }

  return <BaseWalletDetails wallet={wallet} />;
};
