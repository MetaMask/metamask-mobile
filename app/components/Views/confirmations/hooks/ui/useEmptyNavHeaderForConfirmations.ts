import { useMemo } from 'react';
import { useTheme } from '../../../../../util/theme';
import { getEmptyNavHeader } from '../../components/UI/navbar/navbar';

export function useEmptyNavHeaderForConfirmations() {
  const theme = useTheme();
  const memoizedNavbarOptions = useMemo(
    () => getEmptyNavHeader({ theme }),
    [theme],
  );
  return memoizedNavbarOptions;
}
