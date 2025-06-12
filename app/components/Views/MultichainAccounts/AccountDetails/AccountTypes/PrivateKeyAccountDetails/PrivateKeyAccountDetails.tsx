import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from '../BaseAccountDetails';
import RemoveAccount from '../../components/RemoveAccount';
import ExportCredentials from '../../components/ExportCredentials';

interface PrivateKeyAccountDetailsProps {
  account: InternalAccount;
}

export const PrivateKeyAccountDetails = ({
  account,
}: PrivateKeyAccountDetailsProps) => (
  <BaseAccountDetails account={account}>
    <ExportCredentials account={account} />
    <RemoveAccount account={account} />
  </BaseAccountDetails>
);
