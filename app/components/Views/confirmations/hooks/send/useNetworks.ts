import { ImageSourcePropType } from 'react-native';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { getNetworkImageSource } from '../../../../../util/networks';

export interface NetworkInfo {
  chainId: string;
  name: string;
  image: ImageSourcePropType;
}

export const useNetworks = (): NetworkInfo[] => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  const evmNetworks = useMemo(
    () =>
      Object.values(evmNetworkConfigurations).map((network) => ({
        chainId: network.chainId,
        name: network.name,
        image: getNetworkImageSource({
          chainId: network.chainId,
        }),
      })),
    [evmNetworkConfigurations],
  );

  const nonEvmNetworks = useMemo(
    () =>
      Object.values(nonEvmNetworkConfigurations).map((network) => ({
        chainId: network.chainId,
        name: network.name,
        image: network.imageSource,
      })),
    [nonEvmNetworkConfigurations],
  );

  const networks = useMemo(
    () => [...evmNetworks, ...nonEvmNetworks],
    [evmNetworks, nonEvmNetworks],
  );

  return networks;
};
