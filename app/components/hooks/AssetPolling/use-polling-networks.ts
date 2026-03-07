import { useSelector } from 'react-redux';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { useMemo } from 'react';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

export function usePollingNetworks() {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  const networkConfigs: NetworkConfiguration[] = useMemo(() => {
    // Non EVM networks selected
    if (enabledEvmNetworks.length === 0) {
      return [];
    }

    // Filtered all EVM networks
    return (enabledEvmNetworks || [])
      .map((network) => {
        const networkConfig = networkConfigurations[network];
        return networkConfig;
      })
      .filter((c) => Boolean(c));
  }, [enabledEvmNetworks, networkConfigurations]);

  return networkConfigs;
}
