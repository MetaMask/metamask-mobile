import React, { useMemo } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from './AccountTypes/BaseAccountDetails';
import { getMemoizedInternalAccountByAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import PrivateKeyAccountDetails from './AccountTypes/PrivateKeyAccountDetails';
import HardwareAccountDetails from './AccountTypes/HardwareAccountDetails';
import { KeyringTypes } from '@metamask/keyring-controller';
import { isHardwareAccount } from '../../../../util/address';

interface AccountDetailsProps {
  route: {
    params: {
      account: InternalAccount;
    };
  };
}

export const AccountDetails = (props: AccountDetailsProps) => {
  const navigation = useNavigation();
  const {
    account: { address },
  } = props.route.params;
  const account: InternalAccount | undefined = useSelector((state: RootState) =>
    getMemoizedInternalAccountByAddress(state, address),
  );

  const renderAccountDetails = useMemo(() => {
    if (!account) {
      navigation.navigate(Routes.SHEET.ACCOUNT_SELECTOR);
      return null;
    }
    if (account.metadata.keyring.type === KeyringTypes.simple) {
      return <PrivateKeyAccountDetails account={account} />;
    }
    if (isHardwareAccount(account.type)) {
      return <HardwareAccountDetails account={account} />;
    }

    return <BaseAccountDetails account={account} />;
  }, [account, navigation]);

  return renderAccountDetails;
};
