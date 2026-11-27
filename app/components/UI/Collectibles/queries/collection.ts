import { queryOptions } from '@tanstack/react-query';
import { fetchMockCollectionCards } from '../mocks/collection';

export const collectiblesCollectionOptions = queryOptions({
  queryKey: ['collectibles', 'collection'] as const,
  queryFn: fetchMockCollectionCards,
});
