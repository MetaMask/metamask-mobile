import React from 'react';

import { BaseAccountDetails } from '../BaseAccountDetails';
import { InternalAccount } from '@metamask/keyring-internal-api';
import ExportCredentials from '../../components/ExportCredentials';

interface HDAccountDetailsProps {
  account: InternalAccount;
}

export const HDAccountDetails = ({ account }: HDAccountDetailsProps) => (
  <BaseAccountDetails account={account}>
    <ExportCredentials account={account} />
  </BaseAccountDetails>
);
