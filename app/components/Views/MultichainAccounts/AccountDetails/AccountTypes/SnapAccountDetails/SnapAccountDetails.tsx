import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isHDOrFirstPartySnapAccount } from '../../../../../../util/address';
import { BaseAccountDetails } from '../BaseAccountDetails';
import ExportCredentials from '../../components/ExportCredentials';
import RemoveAccount from '../../components/RemoveAccount';

interface SnapAccountDetailsProps {
  account: InternalAccount;
}

export const SnapAccountDetails = ({ account }: SnapAccountDetailsProps) => {
  const isFirstPartySnap = isHDOrFirstPartySnapAccount(account);
  const isRemovable = !isFirstPartySnap;

  return (
    <BaseAccountDetails account={account}>
      {isFirstPartySnap && <ExportCredentials account={account} />}
      {isRemovable && <RemoveAccount account={account} />}
    </BaseAccountDetails>
  );
};
