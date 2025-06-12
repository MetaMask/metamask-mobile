import React from 'react';
import { AccountId } from '@metamask/accounts-controller';
import { BaseWalletDetails } from './BaseWalletDetails';

// types from https://github.com/MetaMask/core/blob/main/packages/account-tree-controller/src/AccountTreeController.ts#L25-L63
export enum AccountWalletCategory {
  Entropy = 'entropy',
  Keyring = 'keyring',
  Snap = 'snap',
}

interface Metadata {
  name: string;
}

interface AccountGroup {
  id: string;
  // Blockchain Accounts:
  accounts: AccountId[];
  metadata: Metadata;
}

export interface AccountWallet {
  id: string;
  // Account groups OR Multichain accounts (once available).
  groups: {
    [groupId: string]: AccountGroup;
  };
  metadata: Metadata;
}

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
