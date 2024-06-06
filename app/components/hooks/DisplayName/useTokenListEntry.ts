import { NameType } from '../../UI/Name/Name.types';
import useTokenList from './useTokenList';

export interface UseTokenListEntriesRequest {
  value: string;
  type: NameType;
}

export function useTokenListEntries(requests: UseTokenListEntriesRequest[]) {
  const tokenList = useTokenList();

  return requests.map(({ value, type }) => {
    if (type !== NameType.EthereumAddress) {
      return null;
    }

    const normalizedValue = value.toLowerCase();

    return tokenList[normalizedValue];
  });
}

export function useTokenListEntry(value: string, type: NameType) {
  return useTokenListEntries([{ value, type }])[0];
}
