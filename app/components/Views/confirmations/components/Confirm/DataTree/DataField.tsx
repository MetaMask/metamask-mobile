import React, { memo } from 'react';
import { Hex, isValidHexAddress } from '@metamask/utils';
import { Text } from 'react-native';

import Address from '../../UI/InfoRow/InfoValue/Address';

const DataField = memo(
  ({
    type,
    value,
    chainId,
  }: {
    type: string;
    value: string;
    chainId: string;
  }) => {
    if (type === 'address' && isValidHexAddress(value as Hex)) {
      return <Address address={value} chainId={chainId} />;
    }

    return <Text>{value}</Text>;
  },
);

export default DataField;
