import React from 'react';

import Name from '../../../../../../../../components/UI/Name';
import { NameType } from '../../../../../../../../components/UI/Name/Name.types';

interface InfoAddressProps {
  address: string;
}

const InfoAddress = ({ address }: InfoAddressProps) => (
  <Name type={NameType.EthereumAddress} value={address} />
);

// const internalAccounts = useSelector(selectInternalAccounts);
// const account = internalAccounts.find((account) =>
//   toLowerCaseEquals(account.address, address),
// );

export default InfoAddress;
