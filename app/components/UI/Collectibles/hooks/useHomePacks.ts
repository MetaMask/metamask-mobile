import { useQuery } from '@tanstack/react-query';
import { collectiblesHomePacksOptions } from '../queries/homePacks';

/** Packs for the Home carousel. Served from mocks for now. */
export function useHomePacks() {
  return useQuery(collectiblesHomePacksOptions);
}
