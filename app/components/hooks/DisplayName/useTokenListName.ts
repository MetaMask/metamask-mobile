import { NameType } from '../../UI/Name/Name.types';
import useTokenList from './useTokenList';

export interface UseTokenListNameRequest {
  value: string;
  type: NameType;
}

export function useTokenListNames(requests: UseTokenListNameRequest[]) {
  const tokenList = useTokenList();

  return requests.map(({ value, type }) => {
    if (type !== NameType.EthereumAddress) {
      return null;
    }

    const normalizedValue = value.toLowerCase();

    return tokenList[normalizedValue];
  });
}

export function useTokenListName(value: string, type: NameType) {
  return useTokenListNames([{ value, type }])[0];
}
