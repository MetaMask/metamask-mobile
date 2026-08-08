import { useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useSelector } from 'react-redux';
import { resolveNetworkDisplayName } from '../../../../../../UI/NetworkMultiSelector/NetworkMultiSelectorUtils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/multichainNetworkController';
import { getNetworkImageSource } from '../../../../../../../util/networks';

export interface ChainOption {
  chainId: string | null;
  name: string;
  imageSource: ImageSourcePropType | undefined;
}

export function useChainDisplayInfos(chainIds: string[]): ChainOption[] {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  return useMemo(() => {
    const uniqueChainIds = [...new Set(chainIds)];

    return uniqueChainIds.map((chainId) => ({
      chainId,
      name: resolveNetworkDisplayName({
        chainId,
        evmNetworkConfigurations,
        nonEvmNetworkConfigurations,
      }),
      imageSource: getNetworkImageSource({ chainId }),
    }));
  }, [chainIds, evmNetworkConfigurations, nonEvmNetworkConfigurations]);
}
