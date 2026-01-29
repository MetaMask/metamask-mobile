import { RefreshControl } from 'react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { useNftDetection } from '../../hooks/useNftDetection';

const NftGridRefreshControl = React.forwardRef<RefreshControl>((props, ref) => {
  const { colors } = useTheme();
  const allEVMNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const enabledNetworks = useSelector(selectEVMEnabledNetworks);

  const { detectNfts } = useNftDetection();

  const [refreshing, setRefreshing] = useState(false);

  const allNetworkClientIds = useMemo(
    () =>
      enabledNetworks.flatMap((chainId) => {
        const entry = allEVMNetworks[chainId];
        if (!entry) {
          return [];
        }
        const index = entry.defaultRpcEndpointIndex;
        const endpoint = entry.rpcEndpoints[index];
        return endpoint?.networkClientId ? [endpoint.networkClientId] : [];
      }),
    [enabledNetworks, allEVMNetworks],
  );

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);

      const { NftController } = Engine.context;
      const actions = [detectNfts()];

      // Also check and update ownership status for all networks
      allNetworkClientIds.forEach((networkClientId) => {
        actions.push(
          NftController.checkAndUpdateAllNftsOwnershipStatus(networkClientId),
        );
      });

      await Promise.allSettled(actions);
      setRefreshing(false);
    });
  }, [detectNfts, allNetworkClientIds]);

  return (
    <RefreshControl
      ref={ref}
      colors={[colors.primary.default]}
      tintColor={colors.icon.default}
      refreshing={refreshing}
      onRefresh={onRefresh}
      {...props}
    />
  );
});

export default NftGridRefreshControl;
