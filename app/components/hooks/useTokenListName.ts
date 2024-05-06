import { NameType } from '../UI/Name/Name.types';
import { useSelector } from 'react-redux';

import { useTokenList } from './useTokenList';

export interface UseTokenListNameRequest {
  value: string;
  type: NameType;
}

export function useTokenListNames(
  requests: UseTokenListNameRequest[],
): (string | null)[] {
  const tokenList = useSelector(useTokenList);

  return requests.map(({ value, type }) => {
    if (type !== NameType.ETHEREUM_ADDRESS) {
      return null;
    }

    const normalizedValue = value.toLowerCase();

    return tokenList[normalizedValue]?.name ?? null;
  });
}

export function useTokenListName(value: string, type: NameType): string | null {
  return useTokenListNames([{ value, type }])[0];
}
