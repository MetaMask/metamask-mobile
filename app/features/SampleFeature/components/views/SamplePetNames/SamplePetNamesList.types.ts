import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';

/**
 * Interface for PetNamesList component props
 *
 * @interface SamplePetNamesListProps
 * @property chainId - The chain ID to filter pet names by
 * @property onAccountPress - Callback when an account is selected
 *
 * @sampleFeature do not use in production code
 */
export interface SamplePetNamesListProps {
  readonly chainId: SupportedCaipChainId | Hex;
  readonly onAccountPress: (params: { address: string; name: string }) => void;
}
