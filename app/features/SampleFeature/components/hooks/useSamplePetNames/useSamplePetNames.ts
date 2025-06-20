import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectSamplePetnamesByChainId } from '../../../selectors/samplePetNameController';

/**
 * Custom hook to get pet names for a specific chain
 *
 * @param chainId - The chain ID to get pet names for
 * @returns Object containing pet names as array of {address, name} objects
 *
 * @sampleFeature do not use in production code
 */
export function useSamplePetNames(chainId: SupportedCaipChainId | Hex) {
  const petNamesByAddress = useSelector((state: RootState) =>
    selectSamplePetnamesByChainId(state, chainId as Hex)
  );

  const petNames = useMemo(() =>
    Object.entries(petNamesByAddress).map(([address, name]) => ({
      address,
      name,
    })),
    [petNamesByAddress]
  );

  return { petNames };
}

