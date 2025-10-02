import React, { useMemo, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useEIP7702Networks } from '../../../../confirmations/hooks/7702/useEIP7702Networks';
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
  const navigation = useNavigation();
  const { network7702List, pending } = useEIP7702Networks(address);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [navigation]);

  const loadingRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <Box key={index} twClassName="mb-2">
          <Box twClassName="w-full flex-row items-center justify-between">
            <Box twClassName="flex-row items-center flex-1">
              <Box twClassName="flex-1">
                <Skeleton style={styles.skeleton} height={35} width="70%" />
              </Box>
            </Box>
            <Box twClassName="ml-3">
              <Skeleton height={35} width={56} style={styles.switchSkeleton} />
            </Box>
          </Box>
        </Box>
      )),
    [styles.skeleton, styles.switchSkeleton],
  );

  if (pending) {
    return <Box>{loadingRows}</Box>;
  }

  return (
    <Box testID="network-flat-list">
      {network7702List.map((network) => (
        <AccountNetworkRow
          key={network.chainId}
          network={network}
          address={address as Hex}
        />
      ))}
    </Box>
  );
};

export default SmartAccountNetworkList;
