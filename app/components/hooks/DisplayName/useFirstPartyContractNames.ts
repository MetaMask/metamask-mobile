import { type Hex } from '@metamask/utils';
import FIRST_PARTY_CONTRACT_NAMES from '../../../constants/first-party-contracts';
import { UseDisplayNameRequest } from './useDisplayName';
import { NameType } from '../../UI/Name/Name.types';

export function useFirstPartyContractNames(
  requests: UseDisplayNameRequest[],
): (string | null)[] {
  return requests.map((request) => {
    const { type, variation } = request;

    if (type !== NameType.EthereumAddress) {
      return null;
    }

    const chainId = variation as Hex;
    const normalizedValue = request.value.toLowerCase();
    const contractNames = Object.keys(FIRST_PARTY_CONTRACT_NAMES);

    const name = contractNames.find(
      (contractName) =>
        FIRST_PARTY_CONTRACT_NAMES[contractName]?.[chainId]?.toLowerCase() ===
        normalizedValue,
    );

    return name ?? null;
  });
}
