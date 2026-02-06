import { useMemo } from 'react';
import { getEmptyNavHeader } from '../../components/UI/navbar/navbar';

export function useEmptyNavHeaderForConfirmations() {
  const memoizedNavbarOptions = useMemo(() => getEmptyNavHeader(), []);
  return memoizedNavbarOptions;
}
