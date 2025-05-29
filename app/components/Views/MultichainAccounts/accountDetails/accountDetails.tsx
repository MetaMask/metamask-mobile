import React, { useMemo } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from './accountTypes/baseAccountDetails';

interface AccountDetailsProps {
  route: {
    params: {
      account: InternalAccount;
    };
  };
}

export const AccountDetails = (props: AccountDetailsProps) => {
  const { account } = props.route.params;

  const renderAccountDetails = useMemo(
    () => <BaseAccountDetails account={account} />,
    [account],
  );

  return renderAccountDetails;
};
