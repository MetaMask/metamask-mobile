import React, { useMemo } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from './AccountTypes/BaseAccountDetails';
import { KeyringTypes } from '@metamask/keyring-controller';
import HDAccountDetails from './AccountTypes/HdAccountDetails';

interface AccountDetailsProps {
  route: {
    params: {
      account: InternalAccount;
    };
  };
}

export const AccountDetails = (props: AccountDetailsProps) => {
  const { account } = props.route.params;

  const renderAccountDetails = useMemo(() => {
    if (!account) {
      return null;
    }

    if (account.metadata.keyring.type === KeyringTypes.hd) {
      return <HDAccountDetails account={account} />;
    }

    return <BaseAccountDetails account={account} />;
  }, [account]);

  return renderAccountDetails;
};
