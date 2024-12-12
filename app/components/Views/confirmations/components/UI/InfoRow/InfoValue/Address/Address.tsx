import React from 'react';

import Name from '../../../../../../../UI/Name';
import { NameType } from '../../../../../../../UI/Name/Name.types';
import { ViewStyle } from 'react-native';

interface AddressProps {
  address: string;
  chainId: string;
  style?: ViewStyle;
}

const Address = ({ address, chainId, style }: AddressProps) => (
  <Name
    type={NameType.EthereumAddress}
    value={address}
    variation={chainId}
    style={style}
  />
);

export default Address;
