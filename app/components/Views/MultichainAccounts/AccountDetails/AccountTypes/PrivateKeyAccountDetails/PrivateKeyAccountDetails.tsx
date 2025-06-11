import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from '../BaseAccountDetails';
import RemoveAccount from '../../components/RemoveAccount';

interface PrivateKeyAccountDetailsProps {
  account: InternalAccount;
}

export const PrivateKeyAccountDetails = ({
  account,
}: PrivateKeyAccountDetailsProps) => (
  <BaseAccountDetails account={account}>
    <RemoveAccount account={account} />
  </BaseAccountDetails>
);
