import { useQuery } from '@tanstack/react-query';
import { collectiblesCollectionOptions } from '../queries/collection';

export function useCollectionCards() {
  return useQuery(collectiblesCollectionOptions);
}
