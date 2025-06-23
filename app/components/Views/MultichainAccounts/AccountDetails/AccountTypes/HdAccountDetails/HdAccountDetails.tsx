import React from 'react';

import { BaseAccountDetails } from '../BaseAccountDetails';
import { InternalAccount } from '@metamask/keyring-internal-api';
import ExportCredentials from '../../components/ExportCredentials';
import SmartAccount from '../../components/SmartAccount';

interface HdAccountDetailsProps {
  account: InternalAccount;
}

export const HdAccountDetails = ({ account }: HdAccountDetailsProps) => (
  <BaseAccountDetails account={account}>
    <ExportCredentials account={account} />
    <SmartAccount account={account} />
  </BaseAccountDetails>
);
