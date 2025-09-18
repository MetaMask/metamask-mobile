import React from 'react';
import { FlatList, View } from 'react-native';
import { useEIP7702Networks } from '../../../../confirmations/hooks/7702/useEIP7702Networks';
import AccountNetworkRow from '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row';
import { Hex } from '@metamask/utils';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './SmartAccountNetworkList.styles';

interface SmartAccountNetworkListProps {
  address: string;
}

const SmartAccountNetworkList = ({ address }: SmartAccountNetworkListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { network7702List, pending } = useEIP7702Networks(address);

  if (pending || network7702List.length === 0) {
    return null;
  }

  return (
    <View style={styles.networkList}>
      <FlatList
        testID="network-flat-list"
        data={network7702List}
        keyExtractor={(item) => item.chainId}
        renderItem={({ item }) => (
          <AccountNetworkRow network={item} address={address as Hex} />
        )}
      />
    </View>
  );
};

export default SmartAccountNetworkList;
