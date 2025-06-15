import {SupportedCaipChainId} from '@metamask/multichain-network-controller';
import {Hex} from '@metamask/utils';

/**
 * Sample interface for PetNamesList component props
 *
 * @sampleFeature do not use in production code
 */
export interface SamplePetNamesListProps {
    chainId: SupportedCaipChainId | Hex;
    onAccountPress: (params: { address: string; name: string }) => void;
}
