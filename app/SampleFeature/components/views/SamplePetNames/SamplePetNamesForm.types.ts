import {Hex} from '@metamask/utils';
import {SupportedCaipChainId} from '@metamask/multichain-network-controller';

/**
 * Sample interface for PetNamesForm component props
 *
 * @sampleFeature do not use in production code
 */
export interface SamplePetNamesFormContentProps {
    chainId: SupportedCaipChainId | Hex;
    initialAddress: string;
    initialName: string;
}
