import React from 'react';

import Name from '../../../../../../../UI/Name';
import { NameType } from '../../../../../../../UI/Name/Name.types';

interface AddressProps {
  address: string;
}

const Address = ({ address }: AddressProps) => (
  <Name type={NameType.EthereumAddress} value={address} />
);

export default Address;
