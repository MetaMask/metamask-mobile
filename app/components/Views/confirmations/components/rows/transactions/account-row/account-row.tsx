import React from 'react';

import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../../../../core/Multichain/utils';
import Name from '../../../../../../UI/Name';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import InfoRow from '../../../UI/info-row';

interface AccountRowProps {
  label: string;
  chainId?: Hex;
}

const AccountRow = ({ label, chainId: chainIdProp }: AccountRowProps) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const chainId = chainIdProp ?? (transactionMetadata?.chainId as Hex);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const address = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';

  return (
    <InfoRow label={label}>
      <Name
        type={NameType.EthereumAddress}
        value={address as string}
        variation={chainId}
      />
    </InfoRow>
  );
};

export default AccountRow;
