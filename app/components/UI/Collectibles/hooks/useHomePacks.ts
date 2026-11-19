import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { collectiblesHomePacksOptions } from '../queries/homePacks';
import { toPackTiles } from '../utils/toPackTiles';

/** Home carousel packs; refetches each time the user comes back to Home. */
export function useHomePacks() {
  const query = useQuery({
    ...collectiblesHomePacksOptions,
    select: toPackTiles,
  });
  const { refetch } = query;

  // The first focus is the mount, which already fetches. useCallback is
  // required here: useFocusEffect re-runs whenever the callback changes, so
  // an unstable callback would refetch on every render.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      refetch();
    }, [refetch]),
  );

  return query;
}
