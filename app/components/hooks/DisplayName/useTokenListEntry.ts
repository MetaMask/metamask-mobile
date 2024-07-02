import { TokenListToken } from '@metamask/assets-controllers';
import { NameType } from '../../UI/Name/Name.types';
import useTokenList from './useTokenList';

export interface UseTokenListEntriesRequest {
  value: string;
  type: NameType;
}

export function useTokenListEntries(requests: UseTokenListEntriesRequest[]) {
  const tokenListArray = useTokenList();

  return requests.map(({ value, type }) => {
    if (type !== NameType.EthereumAddress) {
      return null;
    }

    const normalizedValue = value.toLowerCase();

    return tokenListArray.find(
      (token: TokenListToken) => token.address === normalizedValue,
    );
  });
}

export function useTokenListEntry(value: string, type: NameType) {
  return useTokenListEntries([{ value, type }])[0];
}
