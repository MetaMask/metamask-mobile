import React, { useMemo } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { HDAccountDetails } from './account-types/hd-account-details/hd-account-details';
import { isHardwareAccount } from '../../../../util/address';
import HardwareAccountDetails from './account-types/hardware-account-details';
import PrivateKeyAccountDetails from './account-types/private-key-account-details';
import { SnapAccountDetails } from './account-types/snap-account-details/snap-account-details';
import { BaseAccountDetails } from './account-types/base-account-details';

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
    if (account.metadata.keyring.type === KeyringTypes.hd) {
      return <HDAccountDetails account={account} />;
    }
    if (account.metadata.keyring.type === KeyringTypes.simple) {
      return <PrivateKeyAccountDetails account={account} />;
    }
    if (account.metadata.keyring.type === KeyringTypes.snap) {
      return <SnapAccountDetails account={account} />;
    }
    if (isHardwareAccount(account.type)) {
      return <HardwareAccountDetails account={account} />;
    }

    return <BaseAccountDetails account={account} />;
  }, [account]);

  return renderAccountDetails;
};
