import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import {
  useEIP7702Networks,
  type EIP7702NetworkConfiguration,
} from '../../../../confirmations/hooks/7702/useEIP7702Networks';
import AccountNetworkRow from '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row';
import { Hex } from '@metamask/utils';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './SmartAccountNetworkList.styles';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';

interface SmartAccountNetworkListProps {
  address: string;
}

const SmartAccountNetworkList = ({ address }: SmartAccountNetworkListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { network7702List, pending } = useEIP7702Networks(address);
  const isLoading = pending || network7702List.length === 0;

  const loadingRows = useMemo(() => {
    if (!isLoading) return null;
    return Array.from({ length: 6 }, (_, index) => (
      <Box key={index} twClassName="w-full mb-2">
        <Box twClassName="w-full flex-row items-center justify-between">
          <Box twClassName="flex-row items-center flex-1">
            <Box twClassName="ml-3 flex-1">
              <Skeleton style={styles.skeleton} height={35} width="70%" />
            </Box>
          </Box>
          <Box twClassName="ml-3">
            <Skeleton height={35} width={56} style={styles.switchSkeleton} />
          </Box>
        </Box>
      </Box>
    ));
  }, [isLoading, styles.skeleton, styles.switchSkeleton]);

  const keyExtractor = useCallback(
    (item: EIP7702NetworkConfiguration) => item.chainId,
    [],
  );
  const renderItem = useCallback<ListRenderItem<EIP7702NetworkConfiguration>>(
    ({ item }) => (
      <Box paddingHorizontal={4}>
        <AccountNetworkRow network={item} address={address as Hex} />
      </Box>
    ),
    [address],
  );

  if (isLoading) {
    return <Box twClassName="px-4">{loadingRows}</Box>;
  }

  return (
    <View style={styles.networkList}>
      <FlashList
        testID="network-flat-list"
        data={network7702List}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default SmartAccountNetworkList;
