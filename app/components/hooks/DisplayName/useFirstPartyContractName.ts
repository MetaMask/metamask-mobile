import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { selectChainId } from '../../../selectors/networkController';
import FIRST_PARTY_CONTRACT_NAMES from '../../../constants/first-party-contracts';

export interface UseFirstPartyContractNameRequest {
  value: string;
  chainId: Hex;
}

export function useFirstPartyContractNames(
  requests: UseFirstPartyContractNameRequest[],
): (string | null)[] {
  const currentChainId = useSelector(selectChainId);

  return requests.map((request) => {
    const chainId = request.chainId ?? currentChainId;
    const normalizedValue = request.value.toLowerCase();

    return (
      Object.keys(FIRST_PARTY_CONTRACT_NAMES).find(
        (name) =>
          FIRST_PARTY_CONTRACT_NAMES[name]?.[chainId]?.toLowerCase() ===
          normalizedValue,
      ) ?? null
    );
  });
}

export function useFirstPartyContractName(
  chainId: Hex,
  value: string,
): string | null {
  return useFirstPartyContractNames([{ chainId, value }])[0];
}
