import { useMemo } from 'react';
import { type Hex } from '@metamask/utils';
import FIRST_PARTY_CONTRACT_NAMES from '../../../constants/first-party-contracts';
import { UseDisplayNameRequest } from './useDisplayName';
import { NameType } from '../../UI/Name/Name.types';

// The set of known first-party contracts is a static import, so compute the
// key list once at module load instead of on every lookup.
const CONTRACT_NAMES = Object.keys(FIRST_PARTY_CONTRACT_NAMES);

export function useFirstPartyContractNames(
  requests: UseDisplayNameRequest[],
): (string | null)[] {
  return useMemo(
    () =>
      requests.map((request) => {
        const { type, variation } = request;

        if (type !== NameType.EthereumAddress) {
          return null;
        }

        const chainId = variation as Hex;
        const normalizedValue = request.value.toLowerCase();

        const name = CONTRACT_NAMES.find(
          (contractName) =>
            FIRST_PARTY_CONTRACT_NAMES[contractName]?.[
              chainId
            ]?.toLowerCase() === normalizedValue,
        );

        return name ?? null;
      }),
    [requests],
  );
}
