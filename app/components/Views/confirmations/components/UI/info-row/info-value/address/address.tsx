import React from 'react';

import Name from '../../../../../../../UI/Name';
import { NameType } from '../../../../../../../UI/Name/Name.types';

interface AddressProps {
  address: string;
  chainId: string;
}

const Address = ({ address, chainId }: AddressProps) => (
  <Name type={NameType.EthereumAddress} value={address} variation={chainId} />
);

export default Address;
