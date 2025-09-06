import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectSamplePetnamesByChainId } from '../../../selectors/samplePetNameController';
import { trace, TraceName, TraceOperation } from '../../../../../util/trace';

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
    selectSamplePetnamesByChainId(state, chainId as Hex),
  );

  const petNames = useMemo(
    () =>
      trace(
        {
          name: TraceName.SampleFeatureListPetNames,
          op: TraceOperation.SampleFeatureListPetNames,
          data: {
            feature: 'sample-pet-names',
            operation: 'list-pet-names',
            chainId: chainId as string,
            petNamesCount: Object.keys(petNamesByAddress).length,
          },
          tags: {
            environment: 'development',
            component: 'useSamplePetNames',
          },
        },
        () =>
          Object.entries(petNamesByAddress).map(([address, name]) => ({
            address,
            name,
          })),
      ),
    [petNamesByAddress, chainId],
  );

  return { petNames };
}
