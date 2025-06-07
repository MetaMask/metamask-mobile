import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from '../BaseAccountDetails';
import RemoveAccount from '../../components/RemoveAccount';

interface HardwareAccountDetailsProps {
  account: InternalAccount;
}

export const HardwareAccountDetails = ({
  account,
}: HardwareAccountDetailsProps) => (
  <BaseAccountDetails account={account}>
    <RemoveAccount account={account} />
  </BaseAccountDetails>
);
