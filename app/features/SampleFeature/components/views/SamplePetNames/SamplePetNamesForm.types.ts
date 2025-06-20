import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

/**
 * Interface for PetNamesForm component props
 *
 * @interface SamplePetNamesFormContentProps
 * @property chainId - The chain ID to filter pet names by
 * @property initialAddress - The initial address value
 * @property initialName - The initial name value
 *
 * @sampleFeature do not use in production code
 */
export interface SamplePetNamesFormContentProps {
  readonly chainId: SupportedCaipChainId | Hex;
  readonly initialAddress: string;
  readonly initialName: string;
}
