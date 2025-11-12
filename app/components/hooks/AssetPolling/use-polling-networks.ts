import { useSelector } from 'react-redux';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { useMemo } from 'react';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

export function usePollingNetworks() {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const networkConfigs: NetworkConfiguration[] = useMemo(() => {
    // Non EVM networks selected
    if (!isEvmSelected) {
      return [];
    }

    // Filtered all EVM networks
    return (enabledEvmNetworks || [])
      .map((network) => {
        const networkConfig = networkConfigurations[network];
        return networkConfig;
      })
      .filter((c) => Boolean(c));
  }, [enabledEvmNetworks, isEvmSelected, networkConfigurations]);

  return networkConfigs;
}
